import { FrameHeader } from "./parseFrameHeader";

export const FRAME_SIZE_COEFFICIENT = 144000;
export const FRAME_SIZE_COEFFICIENT_MPEG2 = 72000;

/**
 * Computes the MPEG Layer III frame size in bytes.
 */
export function computeFrameSize({
  bitrateKbps,
  sampleRate,
  padding,
  mpegVersion
}: Pick<FrameHeader, "bitrateKbps" | "sampleRate" | "padding" | "mpegVersion">): number {
  const coefficient = mpegVersion === 1 ? FRAME_SIZE_COEFFICIENT : FRAME_SIZE_COEFFICIENT_MPEG2;
  return Math.floor((coefficient * bitrateKbps) / sampleRate) + padding;
}
