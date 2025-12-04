import { FrameHeader } from "./parseFrameHeader";

export const FRAME_SIZE_COEFFICIENT = 144000;

/**
 * Computes the MPEG-1 Layer III frame size in bytes.
 *
 * Uses the standard formula:
 *   floor((144000 * bitrateKbps) / sampleRate) + padding
 *
 * where:
 *  - `bitrateKbps` is the bitrate in kilobits per second,
 *  - `sampleRate` is the sampling rate in Hz,
 *  - `padding` is either 0 or 1, depending on the frame's padding bit.
 */
export function computeFrameSize({
  bitrateKbps,
  sampleRate,
  padding
}: Pick<FrameHeader, "bitrateKbps" | "sampleRate" | "padding">): number {
  return Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate) + padding;
}
