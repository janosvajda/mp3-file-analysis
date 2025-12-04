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

export function frameList(buffer: Buffer, logger: Logger): FrameInfo[] {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer.");
  }

  const frames: FrameInfo[] = [];
  const id3Size = parseId3v2TagSize(buffer);
  logger.info(`ID3 tag size: ${id3Size} bytes`);
  let offset = id3Size;

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

    const headerSize = 4; // MPEG frame header length in bytes
    frames.push({ offset, frameSize, headerSize, dataSize: frameSize - headerSize });
    logger.info(`Frame ${frames.length - 1} @ offset ${offset} size ${frameSize}`);
    offset = nextOffset;
  }

  if (frames.length === 0) {
    throw new Error("No frames detected in MP3 file.");
  }

  return frames;
}
