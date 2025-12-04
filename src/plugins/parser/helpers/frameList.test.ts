import { expect, test } from "vitest";
import { frameList } from "./frameList";
import { parseFrameHeader } from "./parseFrameHeader";
import { computeFrameSize } from "./computeFrameSize";

const buildHeader = ({
  bitrateIndex = 0b1001, // 128 kbps
  sampleRateIndex = 0b00, // 44100 Hz
  padding = 0,
  versionBits = 0b11,
  layerBits = 0b01,
  sync = true
} = {}) => {
  let header = sync ? 0xffe00000 : 0;
  header |= versionBits << 19;
  header |= layerBits << 17;
  header |= 0b1 << 16;
  header |= bitrateIndex << 12;
  header |= sampleRateIndex << 10;
  header |= padding << 9;
  header |= 0b00 << 6;
  header >>>= 0;
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(header, 0);
  return buffer;
};

const buildFrame = (headerBuffer: Buffer) => {
  const header = parseFrameHeader(headerBuffer, 0);
  const frameSize = computeFrameSize(header);
  const payloadSize = frameSize - headerBuffer.length;
  return Buffer.concat([headerBuffer, Buffer.alloc(Math.max(payloadSize, 0), 0)]);
};

test("lists frame offsets and sizes", () => {
  const logger = { info: () => {} };
  const frame = buildFrame(buildHeader());
  const buffer = Buffer.concat([frame, frame]);

  const frames = frameList(buffer, logger);
  expect(frames).toHaveLength(2);
  expect(frames[0].offset).toBe(0);
  expect(frames[0].frameSize).toBe(frame.length);
  expect(frames[1].offset).toBe(frame.length);
});
