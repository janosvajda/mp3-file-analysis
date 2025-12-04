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
const BITRATE_INDEX_OFFSET = 12;
const SAMPLE_RATE_INDEX_OFFSET = 10;
const PADDING_BIT_OFFSET = 9;

const MPEG_VERSION_1 = 0b11;
const LAYER_III = 0b01;
// MPEG-1 Layer III frame size uses a 144000 coefficient (144 * 1000) when bitrate is in kbps.
const FRAME_SIZE_COEFFICIENT = 144000;

//@todo double check from http://www.mp3-tech.org/programmer/frame_header.html
export type FrameHeader = {
  bitrateKbps: number;
  sampleRate: number;
  padding: number;
};

export function parseFrameHeader(buffer: Buffer, offset: number): FrameHeader {
  // @todo confirm 4-byte header read is always sufficient for MPEG1 Layer III frames?
  if (offset + 4 > buffer.length) {
    throw new Error("Unexpected end of file while reading frame header.");
  }

  const header = buffer.readUInt32BE(offset);

  // Frame sync (first 11 bits) must be all ones.
  if (((header & FRAME_SYNC_MASK) >>> 0) !== FRAME_SYNC_MASK) {
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

  const bitrateKbps = BITRATE_INDEXES[bitrateIndex];
  const sampleRate = SAMPLE_RATE_INDEXES[sampleRateIndex];

  if (!bitrateKbps || !sampleRate) {
    throw new Error("Invalid bitrate or sample rate in frame header.");
  }

  return {
    bitrateKbps,
    sampleRate,
    padding: paddingBit
  };
}

export function computeFrameSize({ bitrateKbps, sampleRate, padding }: FrameHeader): number {
  // Formula for MPEG1 Layer III frame size: floor((144000 * bitrate) / sampleRate) + padding
  return Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate) + padding;
}
