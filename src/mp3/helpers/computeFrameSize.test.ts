import { expect, test } from "vitest";
import { computeFrameSize } from "./computeFrameSize";

test("computes frame size for MPEG1 Layer III", () => {
  const size = computeFrameSize({ bitrateKbps: 128, sampleRate: 44100, padding: 0 });
  expect(size).toBe(Math.floor((144000 * 128) / 44100));
});

test("includes padding bit", () => {
  const size = computeFrameSize({ bitrateKbps: 192, sampleRate: 44100, padding: 1 });
  expect(size).toBe(Math.floor((144000 * 192) / 44100) + 1);
});
