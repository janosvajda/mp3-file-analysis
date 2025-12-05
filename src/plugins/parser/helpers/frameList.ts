import { parseId3v2TagSize } from "./id3";
import { parseFrameHeader } from "./parseFrameHeader";
import { computeFrameSize } from "./computeFrameSize";
import type { Logger } from "../frameAnalyzer";

export type FrameInfo = {
  offset: number;
  frameSize: number;
  headerSize: number;
  dataSize: number;
};

/**
 * MPEG frame headers are always 4 bytes long.
 */
const MP3_FRAME_HEADER_BYTES = 4;
const XING_MAGIC = Buffer.from("Xing");
const INFO_MAGIC = Buffer.from("Info");

const sideInfoSize = (mpegVersion: number, channelMode: number): number => {
  if (mpegVersion === 1) {
    return channelMode === 3 ? 17 : 32; // mono vs stereo
  }
  return channelMode === 3 ? 9 : 17; // MPEG 2/2.5
};

const isMetadataFrame = (
  buffer: Buffer,
  frameOffset: number,
  header: { mpegVersion: number; channelMode: number }
): boolean => {
  const offset =
    frameOffset + MP3_FRAME_HEADER_BYTES + sideInfoSize(header.mpegVersion, header.channelMode);
  const magic = buffer.subarray(offset, offset + 4);
  return magic.equals(XING_MAGIC) || magic.equals(INFO_MAGIC);
};

/**
 * Produces a list of contiguous MPEG audio frames in an MP3 buffer.
 *
 * Steps performed:
 *  1. Detect and skip the ID3v2 metadata block.
 *  2. Scan forward through the buffer, byte-by-byte, until the first valid frame is found.
 *  3. After the first frame, require subsequent frames to be contiguous. Stop scanning on
 *     the first invalid boundary.
 *
 * @throws Error if input is not a Buffer or no valid contiguous frames are detected.
 */
export function frameList(buffer: Buffer, logger: Logger): FrameInfo[] {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer.");
  }

  const frames: FrameInfo[] = [];

  /**
   * ID3v2 tags appear at the start of many MP3 files.
   * They contain metadata, not audio. Their size is encoded
   * in the first 10 bytes, and this function returns the number
   * of bytes to skip before real MPEG frames begin.
   */
  const id3Size = parseId3v2TagSize(buffer);
  logger.info(`ID3 tag size: ${id3Size} bytes`);

  const headerSize = MP3_FRAME_HEADER_BYTES;
  const bufferLength = buffer.length;

  let offset = id3Size;
  let foundFirstFrame = false;
  let resynced = false;

  // Scan the entire buffer, resyncing when an invalid boundary is encountered.
  while (offset + headerSize <= bufferLength) {
    try {
      const header = parseFrameHeader(buffer, offset);
      const frameSize = computeFrameSize(header);

      if (frameSize <= 0 || offset + frameSize > bufferLength) {
        throw new Error("Invalid frame size.");
      }

      const metadataFrame = isMetadataFrame(buffer, offset, header);

      if (!metadataFrame) {
        frames.push({
          offset,
          frameSize,
          headerSize,
          dataSize: frameSize - headerSize
        });

        logger.info(`Frame ${frames.length - 1} @ offset ${offset} size ${frameSize}`);

        foundFirstFrame = true;
      }

      offset += frameSize;
      continue;
    } catch {
      if (!foundFirstFrame) {
        resynced = true;
      }
      offset += 1;
    }
  }

  const minFrames = resynced ? 2 : 1;
  if (!foundFirstFrame || frames.length < minFrames) {
    throw new Error("No valid MPEG frames detected in MP3 file.");
  }

  return frames;
}
