import { expect, test } from "vitest";
import { computeFrameSize, parseFrameHeader } from "./frameHeader";

//@todo this might not be correct yet, needs to be checked in docs, this whole mp3 thing is a big mess
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
  header |= 0b1 << 16; // no CRC
  header |= bitrateIndex << 12;
  header |= sampleRateIndex << 10;
  header |= padding << 9;
  header |= 0b00 << 6; // stereo
  header >>>= 0; // ensure unsigned
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(header, 0);
  return buffer;
};

test("parses a valid header and computes frame size", () => {
  const headerBuffer = buildHeader();
  const parsed = parseFrameHeader(headerBuffer, 0);
  expect(parsed.bitrateKbps).toBe(128);
  expect(parsed.sampleRate).toBe(44100);
  expect(parsed.padding).toBe(0);

  const size = computeFrameSize(parsed);
  expect(size).toBe(Math.floor((144000 * 128) / 44100));
});

test("throws on insufficient header bytes", () => {
  expect(() => parseFrameHeader(Buffer.alloc(2), 0)).toThrow();
});

test("throws on invalid frame sync", () => {
  const headerBuffer = buildHeader({ sync: false });
  expect(() => parseFrameHeader(headerBuffer, 0)).toThrow();
});

test("throws on unsupported version or layer", () => {
  const badVersion = buildHeader({ versionBits: 0b10 });
  expect(() => parseFrameHeader(badVersion, 0)).toThrow();

  const badLayer = buildHeader({ layerBits: 0b10 });
  expect(() => parseFrameHeader(badLayer, 0)).toThrow();
});

test("throws on invalid bitrate or sample rate indexes", () => {
  const freeBitrate = buildHeader({ bitrateIndex: 0b0000 });
  expect(() => parseFrameHeader(freeBitrate, 0)).toThrow();

  const reservedSampleRate = buildHeader({ sampleRateIndex: 0b11 });
  expect(() => parseFrameHeader(reservedSampleRate, 0)).toThrow();
});
