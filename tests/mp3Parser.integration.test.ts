import { expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createFrameAnalyzer } from "../src/mp3";
import { parseFrameHeader } from "../src/mp3/helpers/parseFrameHeader";

test("counts frames in a synthetic MPEG1 Layer III buffer", () => {
  const bitrateIndex = 0b1001; // 128 kbps
  const sampleRateIndex = 0b00; // 44100 Hz
  const padding = 0;

  const buildHeader = () => {
    let header = 0xffe00000; // sync
    header |= 0b11 << 19; // MPEG Version 1
    header |= 0b01 << 17; // Layer III
    header |= 0b1 << 16; // no CRC
    header |= bitrateIndex << 12;
    header |= sampleRateIndex << 10;
    header |= padding << 9;
    header |= 0b00 << 6; // channel mode stereo
    // remaining bits can be left as zero
    header >>>= 0; // ensure unsigned
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(header, 0);
    return buffer;
  };

  const bitrateKbps = 128;
  const sampleRate = 44100;
  const frameSize = Math.floor((144000 * bitrateKbps) / sampleRate) + padding;

  const frame = Buffer.concat([buildHeader(), Buffer.alloc(frameSize - 4, 0)]);

  const syntheticFile = Buffer.concat([frame, frame]); // two frames

  const logger = { info: () => {} };
  const analyzer = createFrameAnalyzer(logger);
  const frameCount = analyzer.countMp3Frames(syntheticFile);
  expect(frameCount).toBe(2);
});

test("throws on invalid buffers", () => {
  const analyzer = createFrameAnalyzer({ info: () => {} });
  expect(() => analyzer.countMp3Frames(Buffer.from([]))).toThrow();
  expect(() => analyzer.countMp3Frames(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toThrow();
});

const samplesDir = path.join(process.cwd(), "samples");
const sampleFiles =
  fs.existsSync(samplesDir) && fs.statSync(samplesDir).isDirectory()
    ? fs.readdirSync(samplesDir).filter((file) => file.toLowerCase().endsWith(".mp3"))
    : [];

// Values below are taken from MediaInfo output for the sample files.
type FrameExpectation = {
  count: number;
  first: { frameIndex: number; headerSize: number; frameSize: number };
  last: { frameIndex: number; headerSize: number; frameSize: number };
};

const expectedByFile: Record<string, FrameExpectation> = {
  "SoundHelix-Song-1.mp3": {
    count: 14268,
    first: { frameIndex: 0, headerSize: 4, frameSize: 626 },
    last: { frameIndex: 14267, headerSize: 4, frameSize: 627 }
  },
  "sample_mp3_3_minutes.mp3": {
    count: 6892,
    first: { frameIndex: 0, headerSize: 4, frameSize: 1044 },
    last: { frameIndex: 6891, headerSize: 4, frameSize: 1045 }
  }
};

test(
  "optionally validates real sample file(s) if provided against MediaInfo expectations",
  { skip: sampleFiles.length === 0 },
  () => {
    for (const file of sampleFiles) {
      const samplePath = path.join(samplesDir, file);
      const sampleBuffer = fs.readFileSync(samplePath);
      const analyzer = createFrameAnalyzer({ info: () => {} });
      const frameCount = analyzer.countMp3Frames(sampleBuffer);
      const frames = analyzer.listMp3Frames(sampleBuffer);

      expect(frameCount).toBeGreaterThan(0);
      console.log(`Sample (${path.basename(samplePath)}) frame count: ${frameCount}`);

      const expectation = expectedByFile[path.basename(file)];
      if (expectation) {
        expect(frameCount).toBe(expectation.count);
        expect(frames.length - 1).toBe(expectation.last.frameIndex);
      }

      const first = frames.at(0);
      const last = frames.at(-1);

      const formatFrame = (
        label: string,
        frame?: { offset: number; frameSize: number; headerSize: number; dataSize: number }
      ) => {
        if (!frame) return;
        const header = parseFrameHeader(sampleBuffer, frame.offset);
        console.log(
          `  ${label} frame: offset=${frame.offset.toString(16).padStart(6, "0")} ` +
            `size=${frame.frameSize} bytes (header=${frame.headerSize} data=${frame.dataSize}) ` +
            `(bitrate=${header.bitrateKbps}kbps sr=${header.sampleRate}Hz padding=${header.padding} mode=${header.channelModeName})`
        );
      };

      formatFrame("First", first);
      if (last && last !== first) {
        formatFrame("Last", last);
      }

      if (!first || !last) {
        throw new Error("No frames returned for sample.");
      }

      if (expectation) {
        expect(first.headerSize).toBe(expectation.first.headerSize);
        expect(first.frameSize).toBe(expectation.first.frameSize);
        expect(last.headerSize).toBe(expectation.last.headerSize);
        expect(last.frameSize).toBe(expectation.last.frameSize);
      }
    }
  }
);
