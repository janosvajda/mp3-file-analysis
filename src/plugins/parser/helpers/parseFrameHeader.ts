import { getChannelMode } from "./getChannelMode";

/**
 * MPEG Version 1, Layer III bitrate table (kbps).
 *
 * Index (bits 15–12) → bitrate in kbps
 *  0000 → free (undefined)
 *  0001 → 32
 *  0010 → 40
 *  ...
 *  1110 → 320
 *  1111 → bad (invalid)
 */
const BITRATE_INDEXES_MPEG1_LAYER3: ReadonlyArray<number | null> = [
  null, // 0000: free
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  160,
  192,
  224,
  256,
  320,
  null // 1111: bad
];

/**
 * MPEG Version 2 / 2.5, Layer III bitrate table (kbps).
 *
 * Index (bits 15–12) → bitrate in kbps
 *  0000 → free (undefined)
 *  0001 → 8
 *  0010 → 16
 *  ...
 *  1110 → 160
 *  1111 → bad (invalid)
 */
const BITRATE_INDEXES_MPEG2_LAYER3: ReadonlyArray<number | null> = [
  null, // 0000: free
  8,
  16,
  24,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  144,
  160,
  null // 1111: bad
];

/**
 * Sample rate table for MPEG Version 1 (Hz).
 *
 * Index (bits 11–10) → sample rate (Hz):
 *  00 → 44100
 *  01 → 48000
 *  10 → 32000
 *  11 → reserved (invalid)
 *
 * For MPEG Version 2 and 2.5, the value is divided by 2 or 4
 * respectively, as per the spec.
 */
const SAMPLE_RATE_INDEXES: ReadonlyArray<number | null> = [
  44100,
  48000,
  32000,
  null // reserved
];

/**
 * Bit mask for the 11-bit frame sync field:
 * bits 31–21 must all be 1 (0xFFE00000).
 */
const FRAME_SYNC_MASK = 0xffe00000 >>> 0;

/**
 * Bit offsets (from LSB) for various header fields.
 *
 * We read the header as a 32-bit big-endian integer:
 *   byte0 byte1 byte2 byte3
 *   [31....................0]
 */
const MPEG_VERSION_OFFSET = 19;      // bits 20–19
const LAYER_OFFSET = 17;             // bits 18–17
const PROTECTION_BIT_OFFSET = 16;    // bit 16
const BITRATE_INDEX_OFFSET = 12;     // bits 15–12
const SAMPLE_RATE_INDEX_OFFSET = 10; // bits 11–10
const PADDING_BIT_OFFSET = 9;        // bit 9
const CHANNEL_MODE_OFFSET = 6;       // bits 7–6
const MODE_EXTENSION_OFFSET = 4;     // bits 5–4
const EMPHASIS_OFFSET = 0;           // bits 1–0

/**
 * MPEG version identification (2-bit field).
 */
const MPEG_VERSION_1 = 0b11; // Version 1
const MPEG_VERSION_2 = 0b10; // Version 2
const MPEG_VERSION_25 = 0b00; // "2.5" (unofficial extension)

/**
 * Layer description (2-bit field).
 */
const LAYER_III = 0b01; // Layer III (the "MP3" layer)

/**
 * MPEG frame header length, always 4 bytes.
 */
const FRAME_HEADER_BYTES = 4;

export type FrameHeader = {
  bitrateKbps: number;
  sampleRate: number;
  padding: number;
  bitrateIndex: number;
  sampleRateIndex: number;
  mpegVersion: 1 | 2 | 2.5;
  versionBits: number;
  layerBits: number;
  protectionBit: number;
  channelMode: number;
  modeExtension: number;
  emphasis: number;
  channelModeName: "stereo" | "joint_stereo" | "dual_channel" | "single_channel";
};

/**
 * Parses a 4-byte MPEG audio frame header at the given offset.
 *
 * The function:
 *  - Ensures there are at least 4 bytes available in the buffer.
 *  - Verifies the 11-bit frame sync (bits 31–21) is all ones.
 *  - Extracts:
 *      - MPEG version (bits 20–19)
 *      - Layer (bits 18–17)
 *      - Protection bit (bit 16)
 *      - Bitrate index (bits 15–12)
 *      - Sample rate index (bits 11–10)
 *      - Padding bit (bit 9)
 *      - Channel mode (bits 7–6)
 *      - Mode extension (bits 5–4)
 *      - Emphasis (bits 1–0)
 *  - Supports MPEG Version 1, 2, and 2.5; Layer III only.
 *  - Resolves bitrate (kbps) and sample rate (Hz) from lookup tables.
 *
 * Throws when:
 *  - The header would run past the end of the buffer.
 *  - The frame sync bits are invalid.
 *  - The MPEG version or layer is unsupported.
 *  - The bitrate or sample rate index is invalid.
 *
 * @param buffer The MP3 data buffer.
 * @param offset Byte offset where the frame header starts.
 * @returns A parsed `FrameHeader` object with both raw bits and derived values.
 */
export function parseFrameHeader(buffer: Buffer, offset: number): FrameHeader {
  if (offset + FRAME_HEADER_BYTES > buffer.length) {
    throw new Error("Unexpected end of file while reading frame header.");
  }

  // Read 32-bit header value at the given offset (big-endian)
  const header = buffer.readUInt32BE(offset);

  // Frame sync (first 11 bits) must be all ones (0x7FF << 21).
  if ((header & FRAME_SYNC_MASK) >>> 0 !== FRAME_SYNC_MASK) {
    throw new Error("Invalid frame sync.");
  }

  // Extract version and layer fields.
  const versionBits = (header >>> MPEG_VERSION_OFFSET) & 0b11;
  const layerBits = (header >>> LAYER_OFFSET) & 0b11;

  const isLayer3 = layerBits === LAYER_III;

  // Decode MPEG version from 2-bit field.
  let mpegVersion: 1 | 2 | 2.5;
  if (versionBits === MPEG_VERSION_1) {
    mpegVersion = 1;
  } else if (versionBits === MPEG_VERSION_2) {
    mpegVersion = 2;
  } else if (versionBits === MPEG_VERSION_25) {
    mpegVersion = 2.5 as const;
  } else {
    throw new Error("Unsupported MPEG version.");
  }

  // Only Layer III is supported by this parser.
  if (!isLayer3) {
    throw new Error("Unsupported MPEG version or layer.");
  }

  // Extract indexes and flags from the header.
  const bitrateIndex = (header >>> BITRATE_INDEX_OFFSET) & 0b1111;
  const sampleRateIndex = (header >>> SAMPLE_RATE_INDEX_OFFSET) & 0b11;
  const paddingBit = (header >>> PADDING_BIT_OFFSET) & 0b1;
  const protectionBit = (header >>> PROTECTION_BIT_OFFSET) & 0b1;
  const channelMode = (header >>> CHANNEL_MODE_OFFSET) & 0b11;
  const modeExtension = (header >>> MODE_EXTENSION_OFFSET) & 0b11;
  const emphasis = (header >>> EMPHASIS_OFFSET) & 0b11;
  // Choose appropriate bitrate table based on MPEG version.
  const bitrateTable =
    mpegVersion === 1 ? BITRATE_INDEXES_MPEG1_LAYER3 : BITRATE_INDEXES_MPEG2_LAYER3;

  const bitrateKbps = bitrateTable[bitrateIndex];
  let sampleRate = SAMPLE_RATE_INDEXES[sampleRateIndex];

  // Adjust sample rate based on version: v2 = half, v2.5 = quarter.
  if (mpegVersion === 2 && sampleRate != null) {
    sampleRate = sampleRate / 2;
  } else if (mpegVersion === 2.5 && sampleRate != null) {
    sampleRate = sampleRate / 4;
  }

  if (bitrateKbps == null || sampleRate == null) {
    throw new Error("Invalid bitrate or sample rate in frame header.");
  }

 return {
    bitrateKbps,
    sampleRate,
    padding: paddingBit,
    bitrateIndex,
    sampleRateIndex,
    mpegVersion,
    versionBits,
    layerBits,
    protectionBit,
    channelMode,
    modeExtension,
    emphasis,
    channelModeName: getChannelMode(channelMode)
  };
}
