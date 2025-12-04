const ID3V2_HEADER_SIZE = 10;
const ID3V2_TAG_SIZE_OFFSET = 6;
const ID3V2_TAG_SIZE_END = ID3V2_TAG_SIZE_OFFSET + 4;

/**
 * Returns the total size in bytes of an ID3v2 tag at the start of the buffer.
 *
 * The function:
 *  - Verifies the buffer is large enough to contain an ID3v2 header.
 *  - Checks for the "ID3" ASCII signature at the beginning of the buffer.
 *  - Reads the 4 syncsafe size bytes starting at offset 6.
 *  - Decodes the syncsafe size and adds the fixed 10-byte header length.
 *
 * If the buffer is too small or does not start with an ID3v2 header,
 * this function returns 0.
 *
 * @param buffer The raw MP3 data.
 * @returns The total ID3v2 tag size in bytes (header + body), or 0 if none.
 */
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
