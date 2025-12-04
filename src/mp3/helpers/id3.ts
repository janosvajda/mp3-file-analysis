const ID3V2_HEADER_SIZE = 10;
const ID3V2_TAG_SIZE_OFFSET = 6;
const ID3V2_TAG_SIZE_END = ID3V2_TAG_SIZE_OFFSET + 4;

export function parseId3v2TagSize(buffer: Buffer): number {
  if (buffer.length < ID3V2_HEADER_SIZE) {
    return 0;
  }

  if (buffer.toString("ascii", 0, 3) !== "ID3") {
    return 0;
  }

  // Size is stored in 4 syncsafe bytes starting at offset 6.
  const sizeBytes = buffer.subarray(ID3V2_TAG_SIZE_OFFSET, ID3V2_TAG_SIZE_END);
  const size =
    (sizeBytes[0] & 0x7f) * 0x200000 +
    (sizeBytes[1] & 0x7f) * 0x4000 +
    (sizeBytes[2] & 0x7f) * 0x80 +
    (sizeBytes[3] & 0x7f);

  // Header is 10 bytes long.
  return size + ID3V2_HEADER_SIZE;
}
