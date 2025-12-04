import { expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { countMp3Frames } from "../src/mp3";

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

  const frame = Buffer.concat([
    buildHeader(),
    Buffer.alloc(frameSize - 4, 0)
  ]);

  const syntheticFile = Buffer.concat([frame, frame]); // two frames

  const frameCount = countMp3Frames(syntheticFile);
  expect(frameCount).toBe(2);
});

test("throws on invalid buffers", () => {
  expect(() => countMp3Frames(Buffer.from([]))).toThrow();
  expect(() => countMp3Frames(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toThrow();
});

const samplesDir = path.join(process.cwd(), "samples");
const sampleFiles =
  fs.existsSync(samplesDir) && fs.statSync(samplesDir).isDirectory()
    ? fs.readdirSync(samplesDir).filter((file) => file.toLowerCase().endsWith(".mp3"))
    : [];

test(
  "optionally validates real sample file(s) if provided",
  { skip: sampleFiles.length === 0 },
  () => {
    for (const file of sampleFiles) {
      const samplePath = path.join(samplesDir, file);
      const sampleBuffer = fs.readFileSync(samplePath);
      const frameCount = countMp3Frames(sampleBuffer);

      expect(frameCount).toBeGreaterThan(0);
      console.log(`Sample (${path.basename(samplePath)}) frame count: ${frameCount}`);
    }
  }
);
