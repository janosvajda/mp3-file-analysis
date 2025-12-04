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

const FRAME_HEADER_BYTES = 4;

/**
 * Produces a list of all MPEG audio frames in an MP3 buffer.
 *
 * This function:
 *  - Skips any ID3v2 tag at the beginning of the file.
 *  - Reads each following MPEG frame header.
 *  - Computes the full frame size.
 *  - Validates that the frame fits within the buffer.
 *  - Records the frame's offset, total size, header size, and payload size.
 *  - Logs each frame as it is encountered.
 *
 * Errors are thrown when:
 *  - The input is not a Buffer.
 *  - A frame reports a non-positive size.
 *  - A frame claims to extend beyond the buffer.
 *  - No frames are found after the ID3 tag.
 *
 * @param buffer The MP3 data.
 * @param logger Logger for diagnostic output.
 * @returns A list of frame metadata.
 */
export function frameList(buffer: Buffer, logger: Logger): FrameInfo[] {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer.");
  }

  const frames: FrameInfo[] = [];
  const id3Size = parseId3v2TagSize(buffer);
  logger.info(`ID3 tag size: ${id3Size} bytes`);

  const headerSize = FRAME_HEADER_BYTES;
  const bufferLength = buffer.length;

  let offset = id3Size;

  while (offset + headerSize <= bufferLength) {
    const header = parseFrameHeader(buffer, offset);
    const frameSize = computeFrameSize(header);

    if (frameSize <= 0) {
      throw new Error("Encountered frame with invalid size.");
    }

    const nextOffset = offset + frameSize;

    if (nextOffset > bufferLength) {
      throw new Error("Frame size exceeds buffer length.");
    }

    frames.push({
      offset,
      frameSize,
      headerSize,
      dataSize: frameSize - headerSize
    });

    logger.info(`Frame ${frames.length - 1} @ offset ${offset} size ${frameSize}`);

    offset = nextOffset;
  }

  if (frames.length === 0) {
    throw new Error("No frames detected in MP3 file.");
  }

  return frames;
}
