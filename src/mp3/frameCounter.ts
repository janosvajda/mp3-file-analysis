import { parseId3v2TagSize } from "./id3";
import { computeFrameSize, parseFrameHeader } from "./frameHeader";

export function countMp3Frames(buffer: Buffer): number {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer.");
  }

  let offset = parseId3v2TagSize(buffer);
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

    frames += 1;
    offset = nextOffset;
  }

  if (frames === 0) {
    throw new Error("No frames detected in MP3 file.");
  }

  return frames;
}
