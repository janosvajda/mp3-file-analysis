import { expect, test } from "vitest";
import { countMp3Frames } from "./frameCounter";
import { parseFrameHeader, computeFrameSize } from "./frameHeader";

const buildHeader = ({
  bitrateIndex = 0b1001, // 128 kbps
  sampleRateIndex = 0b00, // 44100 Hz
  padding = 0,
  versionBits = 0b11,
  layerBits = 0b01,
  sync = true
} = {}) => {
  // @todo extend to cover other MPEG versions/layers and channel modes if support is added.
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

const buildId3Header = (payloadSize: number) => {
  const header = Buffer.alloc(10);
  header.write("ID3", 0, 3, "ascii");
  header.writeUInt8(4, 3); // version major
  header.writeUInt8(0, 4); // version revision
  header.writeUInt8(0, 5); // flags
  // syncsafe size
  header.writeUInt8((payloadSize >> 21) & 0x7f, 6); // syncsafe: 7 bits per byte to avoid 0xFF sync
  header.writeUInt8((payloadSize >> 14) & 0x7f, 7);
  header.writeUInt8((payloadSize >> 7) & 0x7f, 8);
  header.writeUInt8(payloadSize & 0x7f, 9);
  return header;
};

test("counts multiple frames", () => {
  const frame = buildFrame(buildHeader());
  const buffer = Buffer.concat([frame, frame]);
  const count = countMp3Frames(buffer);
  expect(count).toBe(2);
});

test("skips ID3v2 tag and counts frames", () => {
  const frame = buildFrame(buildHeader());
  const id3Header = buildId3Header(0); // zero-sized tag
  const buffer = Buffer.concat([id3Header, frame]);
  const count = countMp3Frames(buffer);
  expect(count).toBe(1);
});

test("throws when no frames found after ID3 tag", () => {
  const id3Header = buildId3Header(0);
  expect(() => countMp3Frames(id3Header)).toThrow();
});

test("throws when frame size exceeds buffer length", () => {
  const headerBuffer = buildHeader();
  const truncatedBuffer = Buffer.concat([headerBuffer, Buffer.alloc(1)]);
  expect(() => countMp3Frames(truncatedBuffer)).toThrow();
});

test("throws on invalid frame data", () => {
  const invalidHeader = buildHeader({ sync: false });
  const buffer = Buffer.concat([invalidHeader, Buffer.alloc(10)]);
  expect(() => countMp3Frames(buffer)).toThrow();
});

test("rejects non-buffer input", () => {
  expect(() => countMp3Frames("not a buffer" as unknown as Buffer)).toThrow();
});
