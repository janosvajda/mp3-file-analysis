import { expect, test } from "vitest";
import { computeFrameSize, FRAME_SIZE_COEFFICIENT } from "./computeFrameSize";

test("computes frame size for MPEG1 Layer III", () => {
  const bitrateKbps = 128;
  const sampleRate = 44100;
  const size = computeFrameSize({ bitrateKbps, sampleRate, padding: 0 });
  expect(size).toBe(Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate));
});

test("includes padding bit", () => {
  const bitrateKbps = 192;
  const sampleRate = 44100;
  const padding = 1;
  const size = computeFrameSize({ bitrateKbps, sampleRate, padding });
  expect(size).toBe(Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate) + padding);
});
