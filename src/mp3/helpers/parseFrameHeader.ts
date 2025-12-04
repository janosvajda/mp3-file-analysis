import { getChannelMode } from "./getChannelMode";

const BITRATE_INDEXES: Array<number | null> = [
  null, // free
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
  320, //@todo is this the max?
  null // bad
];

const SAMPLE_RATE_INDEXES: Array<number | null> = [
  44100,
  48000,
  32000,
  null // reserved
];

const FRAME_SYNC_MASK = 0xffe00000 >>> 0;
const MPEG_VERSION_OFFSET = 19;
const LAYER_OFFSET = 17;
const PROTECTION_BIT_OFFSET = 16;
const BITRATE_INDEX_OFFSET = 12;
const SAMPLE_RATE_INDEX_OFFSET = 10;
const PADDING_BIT_OFFSET = 9;
const CHANNEL_MODE_OFFSET = 6;
const MODE_EXTENSION_OFFSET = 4;
const EMPHASIS_OFFSET = 0;

const MPEG_VERSION_1 = 0b11;
const LAYER_III = 0b01;
const FRAME_HEADER_BYTES = 4; // MPEG frame header length in bytes
//@todo double check from http://www.mp3-tech.org/programmer/frame_header.html

export type FrameHeader = {
  bitrateKbps: number;
  sampleRate: number;
  padding: number;
  bitrateIndex: number;
  sampleRateIndex: number;
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
 *  - Verifies the 11-bit frame sync is all ones.
 *  - Extracts MPEG version, layer, bitrate index, sample rate index, padding,
 *    protection bit, channel mode, mode extension, and emphasis.
 *  - Currently only supports MPEG Version 1, Layer III frames.
 *  - Looks up the actual bitrate (kbps) and sample rate (Hz) from the header indexes.
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
  // @todo confirm 4-byte header read is always sufficient for MPEG1 Layer III frames?
  if (offset + FRAME_HEADER_BYTES > buffer.length) {
    throw new Error("Unexpected end of file while reading frame header.");
  }

  const header = buffer.readUInt32BE(offset);

  // Frame sync (first 11 bits) must be all ones.
  if ((header & FRAME_SYNC_MASK) >>> 0 !== FRAME_SYNC_MASK) {
    throw new Error("Invalid frame sync.");
  }

  const versionBits = (header >>> MPEG_VERSION_OFFSET) & 0x3;
  const layerBits = (header >>> LAYER_OFFSET) & 0x3;

  //@todo now only this version is supported, but this can be more flexible, ready for extension
  const isMpegVersion1 = versionBits === MPEG_VERSION_1;
  const isLayer3 = layerBits === LAYER_III;

  if (!isMpegVersion1 || !isLayer3) {
    throw new Error("Unsupported MPEG version or layer.");
  }

  const bitrateIndex = (header >>> BITRATE_INDEX_OFFSET) & 0xf;
  const sampleRateIndex = (header >>> SAMPLE_RATE_INDEX_OFFSET) & 0x3;
  const paddingBit = (header >>> PADDING_BIT_OFFSET) & 0x1;
  const protectionBit = (header >>> PROTECTION_BIT_OFFSET) & 0x1;
  const channelMode = (header >>> CHANNEL_MODE_OFFSET) & 0x3;
  const modeExtension = (header >>> MODE_EXTENSION_OFFSET) & 0x3;
  const emphasis = (header >>> EMPHASIS_OFFSET) & 0x3;

  const bitrateKbps = BITRATE_INDEXES[bitrateIndex];
  const sampleRate = SAMPLE_RATE_INDEXES[sampleRateIndex];

  if (bitrateKbps == null || sampleRate == null) {
    throw new Error("Invalid bitrate or sample rate in frame header.");
  }

  return {
    bitrateKbps,
    sampleRate,
    padding: paddingBit,
    bitrateIndex,
    sampleRateIndex,
    versionBits,
    layerBits,
    protectionBit,
    channelMode,
    modeExtension,
    emphasis,
    channelModeName: getChannelMode(channelMode)
  };
}