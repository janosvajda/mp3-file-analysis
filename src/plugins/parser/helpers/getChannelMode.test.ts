import { expect, test } from "vitest";
import { getChannelMode } from "./getChannelMode";

test("maps channel mode bits to names", () => {
  expect(getChannelMode(0)).toBe("stereo");
  expect(getChannelMode(1)).toBe("joint_stereo");
  expect(getChannelMode(2)).toBe("dual_channel");
  expect(getChannelMode(3)).toBe("single_channel");
});

test("defaults to stereo on unknown mode", () => {
  expect(getChannelMode(99)).toBe("stereo");
});
