import type { FrameHeader } from "./parseFrameHeader";

/**
 * Maps the MPEG channel mode index (0–3) to its descriptive name.
 * Falls back to `"stereo"` if the mode value is out of range.
 *
 * @param mode Numeric MPEG channel mode (0–3).
 * @returns The corresponding channel mode name.
 */
export function getChannelMode(mode: number): FrameHeader["channelModeName"] {
  const modes: Record<number, FrameHeader["channelModeName"]> = {
    0: "stereo",
    1: "joint_stereo",
    2: "dual_channel",
    3: "single_channel"
  };

  return modes[mode] ?? "stereo";
}
