import { expect, test, describe } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createFrameAnalyzer } from "../src/plugins/parser";
import { parseFrameHeader } from "../src/plugins/parser/helpers/parseFrameHeader";

/**
 * Minimal logger implementation for tests.
 * We only care that `info()` exists; output is ignored.
 */
const createNoopLogger = () => ({ info: () => {} });

/**
 * Convenience factory for the frame analyzer used in tests.
 */
const createTestAnalyzer = () => createFrameAnalyzer(createNoopLogger());

/**
 * Builds a synthetic MPEG-1 Layer III frame header.
 *
 * - 11-bit sync: 0x7FF
 * - MPEG Version 1 (0b11)
 * - Layer III (0b01)
 * - No CRC
 * - Stereo channel mode
 *
 * Remaining fields (mode extension, emphasis, etc.) are left at 0.
 */
function buildMpeg1Layer3Header(opts: {
  bitrateIndex: number;
  sampleRateIndex: number;
  padding: number;
}): Buffer {
  const { bitrateIndex, sampleRateIndex, padding } = opts;

  let header = 0xffe00000; // sync (11 bits set)
  header |= 0b11 << 19; // MPEG Version 1
  header |= 0b01 << 17; // Layer III
  header |= 0b1 << 16; // no CRC
  header |= bitrateIndex << 12;
  header |= sampleRateIndex << 10;
  header |= padding << 9;
  header |= 0b00 << 6; // channel mode: stereo
  header >>>= 0; // force unsigned

  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(header, 0);
  return buffer;
}

/**
 * Synthetic integration tests:
 *  - Build an in-memory MPEG-1 Layer III buffer.
 *  - Verify that the analyzer counts frames correctly.
 *  - Verify that obviously invalid buffers are rejected.
 */
describe("frame analyzer – synthetic buffers", () => {
  test("counts frames in a synthetic MPEG1 Layer III buffer", () => {
    // Header fields: 128 kbps @ 44100 Hz, no padding.
    const bitrateIndex = 0b1001; // 128 kbps
    const sampleRateIndex = 0b00; // 44100 Hz
    const padding = 0;

    const header = buildMpeg1Layer3Header({
      bitrateIndex,
      sampleRateIndex,
      padding
    });

    const bitrateKbps = 128;
    const sampleRate = 44100;

    // MPEG-1 Layer III frame size formula:
    //   floor(144000 * bitrate_kbps / sampleRate) + padding
    const frameSize =
      Math.floor((144000 * bitrateKbps) / sampleRate) + padding;

    // Construct a single frame: 4-byte header + payload.
    const frame = Buffer.concat([
      header,
      Buffer.alloc(frameSize - header.length, 0)
    ]);

    // Two identical frames back-to-back.
    const syntheticFile = Buffer.concat([frame, frame]);

    const analyzer = createTestAnalyzer();
    const frameCount = analyzer.countMp3Frames(syntheticFile);

    expect(frameCount).toBe(2);
  });

  test("throws on invalid buffers", () => {
    const analyzer = createTestAnalyzer();

    // Empty buffer: no header, no frames.
    expect(() => analyzer.countMp3Frames(Buffer.from([]))).toThrow();

    // Random bytes: invalid frame sync / header.
    expect(() =>
      analyzer.countMp3Frames(Buffer.from([0x00, 0x01, 0x02, 0x03]))
    ).toThrow();
  });
});

/**
 * Optional real-file integration tests:
 *
 * If a `samples/` directory exists at the project root and contains
 * `.mp3` (or `.mp2`) files, we:
 *  - Run the analyzer on each file.
 *  - Compare results against known expectations taken from MediaInfo.
 *  - Assert that unsupported formats (e.g. .mp2) are rejected.
 */
const samplesDir = path.join(process.cwd(), "samples");

const sampleFiles =
  fs.existsSync(samplesDir) && fs.statSync(samplesDir).isDirectory()
    ? fs
        .readdirSync(samplesDir)
        .filter((file) => file.toLowerCase().endsWith(".mp3"))
    : [];

// Values below are taken from MediaInfo output for the sample files.
type FrameExpectationValid = {
  count: number;
  first: { frameIndex: number; headerSize: number; frameSize: number };
  last: { frameIndex: number; headerSize: number; frameSize: number };
};

type FrameExpectationInvalid = { expectInvalid: true };

type FrameExpectation = FrameExpectationValid | FrameExpectationInvalid;

/**
 * Expectations for known sample files in the `samples/` directory.
 *
 * - For valid MP3s: we assert frame count and first/last frame sizes.
 * - For unsupported formats (e.g. MP2): we assert that parsing fails.
 */
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
  },
  "sample3.mp2": {
    // This is an MPEG Layer II file and should be rejected by the analyzer.
    expectInvalid: true
  }
};

test(
  "optionally validates real sample file(s) against MediaInfo expectations",
  { skip: sampleFiles.length === 0 },
  () => {
    for (const file of sampleFiles) {
      const samplePath = path.join(samplesDir, file);
      const sampleBuffer = fs.readFileSync(samplePath);

      const analyzer = createTestAnalyzer();
      const expectation = expectedByFile[path.basename(file)];

      // Files explicitly marked as invalid (e.g. .mp2) must throw.
      if (expectation && "expectInvalid" in expectation) {
        expect(() => analyzer.countMp3Frames(sampleBuffer)).toThrow();
        continue;
      }

      const frameCount = analyzer.countMp3Frames(sampleBuffer);
      const frames = analyzer.listMp3Frames(sampleBuffer);

      expect(frameCount).toBeGreaterThan(0);
      console.log(
        `Sample (${path.basename(samplePath)}) frame count: ${frameCount}`
      );

      // When we have MediaInfo expectations, assert frame count and last index.
      if (expectation) {
        expect(frameCount).toBe(expectation.count);
        expect(frames.length - 1).toBe(expectation.last.frameIndex);
      }

      const first = frames.at(0);
      const last = frames.at(-1);

      /**
       * Pretty-prints basic information about a frame:
       *  - offset (hex)
       *  - total size (header + payload)
       *  - header / payload sizes
       *  - decoded header fields (bitrate, sample rate, padding, channel mode)
       */
      const formatFrame = (
        label: string,
        frame?: {
          offset: number;
          frameSize: number;
          headerSize: number;
          dataSize: number;
        }
      ) => {
        if (!frame) return;

        const header = parseFrameHeader(sampleBuffer, frame.offset);

        console.log(
          `  ${label} frame: offset=${frame.offset
            .toString(16)
            .padStart(6, "0")} ` +
            `size=${frame.frameSize} bytes (header=${frame.headerSize} data=${frame.dataSize}) ` +
            `(bitrate=${header.bitrateKbps}kbps sr=${header.sampleRate}Hz ` +
            `padding=${header.padding} mode=${header.channelModeName})`
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
