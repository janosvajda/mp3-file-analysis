import { expect, test } from "vitest";
import { frameCount } from "./frameCount";
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

test("counts frames and logs", () => {
  const loggerMessages: string[] = [];
  const logger = { info: (msg: string) => loggerMessages.push(msg) };
  const frame = buildFrame(buildHeader());
  const buffer = Buffer.concat([frame, frame]);

  const count = frameCount(buffer, logger);
  expect(count).toBe(2);
  expect(loggerMessages.some((msg) => msg.includes("Frame 0 @ offset 0"))).toBe(true);
});

test("throws on non-buffer", () => {
  const logger = { info: () => {} };
  expect(() => frameCount("not a buffer" as unknown as Buffer, logger)).toThrow();
});

test("throws when no frames detected", () => {
  const logger = { info: () => {} };
  expect(() => frameCount(Buffer.alloc(0), logger)).toThrow();
});
