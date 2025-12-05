import { parseId3v2TagSize } from "./id3";
import { parseFrameHeader } from "./parseFrameHeader";
import { computeFrameSize } from "./computeFrameSize";
import type { Logger } from "../frameAnalyzer";

/**
 * MPEG frame headers are always 4 bytes.
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
    frameOffset +
    MP3_FRAME_HEADER_BYTES +
    sideInfoSize(header.mpegVersion, header.channelMode);
  const magic = buffer.subarray(offset, offset + 4);
  return magic.equals(XING_MAGIC) || magic.equals(INFO_MAGIC);
};

/**
 * Counts the number of MPEG audio frames in an MP3 buffer.
 *
 * Strategy:
 *  - Skip the ID3v2 tag if present.
 *  - Scan forward until the first valid Layer III frame is found.
 *  - After the first frame, require subsequent frames to be *contiguous*.
 *    If the next expected frame boundary is not valid, stop counting.
 *  - Require a minimum contiguous run of frames to guard against
 *    random false positives in non-MP3 data.
 *
 * @throws {Error} when input is not a Buffer or no valid frame run is found.
 */
export function frameCount(buffer: Buffer, logger: Logger): number {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer.");
  }

  const id3Size = parseId3v2TagSize(buffer);
  logger.info(`ID3 tag size: ${id3Size} bytes`);

  let offset = id3Size;
  let frameIndex = 0;
  let resynced = false;

  while (offset + MP3_FRAME_HEADER_BYTES <= buffer.length) {
    try {
      const header = parseFrameHeader(buffer, offset);
      const frameSize = computeFrameSize(header);
      if (frameSize <= 0 || offset + frameSize > buffer.length) {
        throw new Error("Invalid frame size.");
      }

      const metadataFrame = isMetadataFrame(buffer, offset, header);
      if (!metadataFrame) {
        logger.info(`Frame ${frameIndex} @ offset ${offset} size ${frameSize}`);
        frameIndex += 1;
      }

      offset += frameSize;
      continue;
    } catch {
      if (frameIndex === 0) {
        resynced = true;
      }
      offset += 1;
    }
  }

  // Guard against random false positives by requiring a short run.
  const minFrames = resynced ? 2 : 1;
  if (frameIndex < minFrames) {
    throw new Error("No valid MPEG frames detected in MP3 file.");
  }

  return frameIndex;
}
