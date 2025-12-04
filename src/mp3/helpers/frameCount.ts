import { parseId3v2TagSize } from "./id3";
import { parseFrameHeader } from "./parseFrameHeader";
import { computeFrameSize } from "./computeFrameSize";
import type { Logger } from "../frameAnalyzer";

export function frameCount(buffer: Buffer, logger: Logger): number {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer.");
  }

  const id3Size = parseId3v2TagSize(buffer);
  logger.info(`ID3 tag size: ${id3Size} bytes`);

  let offset = id3Size;
  let frames = 0;

  while (offset + 4 <= buffer.length) {
    const header = parseFrameHeader(buffer, offset);
    const frameSize = computeFrameSize(header);

    if (frameSize <= 0) {
      throw new Error("Encountered frame with invalid size.");
    }

    const nextOffset = offset + frameSize;

    if (nextOffset > buffer.length) {
      throw new Error("Frame size exceeds buffer length.");
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
