const ID3V2_HEADER_SIZE = 10;

/**
 * In an ID3v2 header, the tag size (excluding header) is stored in
 * 4 sync-safe bytes at offsets 6–9.
 */
const ID3V2_SIZE_FIELD_OFFSET = 6;
const ID3V2_SIZE_FIELD_END = ID3V2_SIZE_FIELD_OFFSET + 4;

/**
 * Decodes a 4-byte sync-safe integer as used by ID3v2.
 *
 * Each byte uses only 7 bits (0xxxxxxx), so the effective value is:
 *
 *  size =
 *    b0 * 0x200000 +
 *    b1 * 0x4000   +
 *    b2 * 0x80     +
 *    b3
 *
 * where each bN is masked with 0x7f to drop the top bit.
 */
function decodeSyncSafeSize(sizeBytes: Buffer): number {
  return (
    (sizeBytes[0] & 0x7f) * 0x200000 +
    (sizeBytes[1] & 0x7f) * 0x4000 +
    (sizeBytes[2] & 0x7f) * 0x80 +
    (sizeBytes[3] & 0x7f)
  );
}

/**
 * Returns the total size in bytes of an ID3v2 tag at the start of the buffer.
 *
 * The function:
 *  - Verifies the buffer is large enough to contain an ID3v2 header.
 *  - Checks for the "ID3" ASCII signature at the beginning of the buffer.
 *  - Reads the 4 sync-safe size bytes starting at offset 6.
 *  - Decodes the sync-safe size and adds the fixed 10-byte header length.
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

  // Size is stored in 4 sync-safe bytes starting at offset 6.
  const sizeBytes = buffer.subarray(ID3V2_SIZE_FIELD_OFFSET, ID3V2_SIZE_FIELD_END);

  const size = decodeSyncSafeSize(sizeBytes);

  // Header is 10 bytes long.
  // @todo this must be checked and might be improved as mp3 files can have diff ID3 headers,
  // and some mp3 codec put this at the end of the file...
  return size + ID3V2_HEADER_SIZE;
}
