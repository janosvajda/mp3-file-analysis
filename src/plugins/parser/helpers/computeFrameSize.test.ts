import { expect, test } from "vitest";
import {
  computeFrameSize,
  FRAME_SIZE_COEFFICIENT,
  FRAME_SIZE_COEFFICIENT_MPEG2
} from "./computeFrameSize";

test("computes frame size for MPEG1 Layer III", () => {
  const bitrateKbps = 128;
  const sampleRate = 44100;
  const size = computeFrameSize({ bitrateKbps, sampleRate, padding: 0, mpegVersion: 1 });
  expect(size).toBe(Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate));
});

test("includes padding bit", () => {
  const bitrateKbps = 192;
  const sampleRate = 44100;
  const padding = 1;
  const size = computeFrameSize({ bitrateKbps, sampleRate, padding, mpegVersion: 1 });
  expect(size).toBe(Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate) + padding);
});

test("uses MPEG2 coefficient for MPEG2/2.5 Layer III", () => {
  const bitrateKbps = 64;
  const sampleRate = 22050;
  const size = computeFrameSize({ bitrateKbps, sampleRate, padding: 0, mpegVersion: 2 });
  expect(size).toBe(Math.floor((FRAME_SIZE_COEFFICIENT_MPEG2 * bitrateKbps) / sampleRate));
});
