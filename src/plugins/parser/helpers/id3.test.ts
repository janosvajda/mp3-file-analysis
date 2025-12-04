import { expect, test } from "vitest";
import { parseId3v2TagSize } from "./id3";

test("returns 0 for buffers smaller than header", () => {
  expect(parseId3v2TagSize(Buffer.alloc(5))).toBe(0);
});

test("returns 0 when no ID3 signature present", () => {
  const buffer = Buffer.alloc(12, 0);
  buffer.write("NO!", 0, 3, "ascii");
  expect(parseId3v2TagSize(buffer)).toBe(0);
});

test("parses syncsafe size from ID3 header", () => {
  const payloadSize = 20; // arbitrary payload length
  const header = Buffer.alloc(10, 0);
  header.write("ID3", 0, 3, "ascii");
  header.writeUInt8(4, 3); // version major
  header.writeUInt8(0, 4); // version revision
  header.writeUInt8(0, 5); // flags
  header.writeUInt8((payloadSize >> 21) & 0x7f, 6);
  header.writeUInt8((payloadSize >> 14) & 0x7f, 7);
  header.writeUInt8((payloadSize >> 7) & 0x7f, 8);
  header.writeUInt8(payloadSize & 0x7f, 9);

  const size = parseId3v2TagSize(header);
  expect(size).toBe(payloadSize + 10);
});
