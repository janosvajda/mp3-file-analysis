import { FrameHeader } from "./parseFrameHeader";

export function computeFrameSize({
  bitrateKbps,
  sampleRate,
  padding
}: Pick<FrameHeader, "bitrateKbps" | "sampleRate" | "padding">): number {
  // Formula for MPEG1 Layer III frame size: floor((144000 * bitrate) / sampleRate) + padding
  return Math.floor((144000 * bitrateKbps) / sampleRate) + padding;
}
