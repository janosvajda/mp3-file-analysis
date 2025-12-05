import type { FrameHeader } from "./parseFrameHeader";

/**
 * MPEG audio channel mode lookup table.
 *
 * 0 → stereo
 * 1 → joint stereo
 * 2 → dual channel
 * 3 → single channel
 *
 * Defined using `as const` to preserve literal string types.
 */
const CHANNEL_MODES = {
  0: "stereo",
  1: "joint_stereo",
  2: "dual_channel",
  3: "single_channel"
} as const satisfies Record<number, FrameHeader["channelModeName"]>;

/**
 * Returns the human-readable MPEG channel mode name for a
 * channel mode index (0–3). Values outside the MPEG spec
 * default to `"stereo"` for safety.
 *
 * MPEG Channel Mode bits (from frame header):
 *  - 00 → Stereo
 *  - 01 → Joint stereo
 *  - 02 → Dual channel
 *  - 03 → Single channel
 *
 * @param mode The MPEG channel mode index (0–3).
 * @returns One of the allowed `channelModeName` strings.
 */
export function getChannelMode(mode: number): FrameHeader["channelModeName"] {
  return CHANNEL_MODES[mode as keyof typeof CHANNEL_MODES] ?? "stereo";
}
