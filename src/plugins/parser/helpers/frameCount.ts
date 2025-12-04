import { parseId3v2TagSize } from "./id3";
import { parseFrameHeader } from "./parseFrameHeader";
import { computeFrameSize } from "./computeFrameSize";
import type { Logger } from "../frameAnalyzer";

const FRAME_HEADER_BYTES = 4;

/**
 * Counts the number of MPEG audio frames in an MP3 buffer.
 *
 * The function:
 *  - Skips any ID3v2 tag at the beginning of the file.
 *  - Iterates through each MPEG audio frame by:
 *      - parsing its header,
 *      - computing its full size,
 *      - validating boundaries,
 *      - advancing to the next frame.
 *  - Logs each frame as it is discovered.
 *
 * Errors are thrown when:
 *  - The input is not a Buffer.
 *  - A frame has a non-positive size.
 *  - A frame would extend beyond the end of the buffer.
 *  - No valid frames are detected.
 *
 * @param buffer The raw MP3 data.
 * @param logger Logger used for diagnostic output.
 * @returns The number of MPEG audio frames in the file.
 */
export function frameCount(buffer: Buffer, logger: Logger): number {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer.");
  }

  const id3Size = parseId3v2TagSize(buffer);
  logger.info(`ID3 tag size: ${id3Size} bytes`);

  let offset = id3Size;
  let frames = 0;

  while (offset + FRAME_HEADER_BYTES <= buffer.length) {
    let header;
    try {
      header = parseFrameHeader(buffer, offset);
    } catch {
      offset += 1;
      continue;
    }
    const frameSize = computeFrameSize(header);

    if (frameSize <= 0) {
      offset += 1;
      continue;
    }

    const nextOffset = offset + frameSize;

    if (nextOffset > buffer.length) {
      offset += 1;
      continue;
    }

    logger.info(`Frame ${frames} @ offset ${offset} size ${frameSize}`);

    frames += 1;
    offset = nextOffset;
  }

  if (frames === 0) {
    throw new Error("No frames detected in MP3 file.");
  }

  return frames;
}
