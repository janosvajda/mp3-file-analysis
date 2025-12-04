import type { FrameHeader } from "./frameHeader";

export function getChannelMode(mode: number): FrameHeader["channelModeName"] {
  switch (mode) {
    case 0:
      return "stereo";
    case 1:
      return "joint_stereo";
    case 2:
      return "dual_channel";
    case 3:
      return "single_channel";
    default:
      return "stereo";
  }
}
