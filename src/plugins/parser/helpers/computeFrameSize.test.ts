import { expect, test, describe } from "vitest";
import {
  computeFrameSize,
  FRAME_SIZE_COEFFICIENT,
  FRAME_SIZE_COEFFICIENT_MPEG2
} from "./computeFrameSize";

/**
 * MPEG Layer III frame size formula (per ISO/IEC 11172-3 / 13818-3):
 *
 *   frameSize = floor( coef * bitrate_kbps / sampleRate ) + padding
 *
 * Where:
 *   - coef = 144000 for MPEG-1 Layer III
 *   - coef =  72000 for MPEG-2 / MPEG-2.5 Layer III
 *
 * Padding is either 0 or 1 and adds exactly 1 byte when set.
 *
 * ------------------------------------------------------------------
 * Supported by this assestment
 * ------------------------------------------------------------------
 *
 * The parsing code (`parseFrameHeader` + `computeFrameSize`) only
 * supports MPEG Layer III (MP3) for the following MPEG versions:
 *
 * | MPEG Version | Layer | Sample rate indexes (base) | Effective sample rates (Hz)     |
 * |-------------|-------|----------------------------|----------------------------------|
 * | 1           | III   | 0, 1, 2                    | 44100, 48000, 32000             |
 * | 2           | III   | 0, 1, 2                    | 22050, 24000, 16000 (base / 2)  |
 * | 2.5         | III   | 0, 1, 2                    | 11025, 12000, 8000  (base / 4)  |
 *
 * The base table in `parseFrameHeader` is:
 *   [44100, 48000, 32000, null]
 *
 * For MPEG-2, the sample rate is base / 2.
 * For MPEG-2.5, the sample rate is base / 4.
 *
 * ------------------------------------------------------------------
 * Not supported things:
 * ------------------------------------------------------------------
 *
 * - MPEG Layers I and II (only Layer III is handled).
 * - Other MPEG version bit patterns outside {1, 2, 2.5}.
 *
 * Those unsupported combinations are rejected earlier in
 * `parseFrameHeader` and never reach `computeFrameSize`. This tests
 * are for only on valid combinations that are actually used by
 * the frame scanner.
 */

describe("computeFrameSize", () => {
  test("computes frame size for MPEG1 Layer III", () => {
    const bitrateKbps = 128;
    const sampleRate = 44100;
    const padding = 0;

    const size = computeFrameSize({
      bitrateKbps,
      sampleRate,
      padding,
      mpegVersion: 1
    });

    const expected = Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate) + padding;

    expect(size).toBe(expected);
  });

  test("includes padding bit for MPEG1 Layer III", () => {
    const bitrateKbps = 192;
    const sampleRate = 44100;
    const padding = 1;

    const size = computeFrameSize({
      bitrateKbps,
      sampleRate,
      padding,
      mpegVersion: 1
    });

    const expected = Math.floor((FRAME_SIZE_COEFFICIENT * bitrateKbps) / sampleRate) + padding;

    expect(size).toBe(expected);
  });

  test("matches known MPEG1 Layer III frame size (128 kbps @ 44.1 kHz → 417 bytes)", () => {
    const bitrateKbps = 128;
    const sampleRate = 44100;
    const padding = 0;

    const size = computeFrameSize({
      bitrateKbps,
      sampleRate,
      padding,
      mpegVersion: 1
    });

    // Common MP3 frame size: 128 kbps, 44.1 kHz, no padding → 417 bytes
    expect(size).toBe(417);
  });

  test("uses MPEG2 coefficient for MPEG2 Layer III", () => {
    const bitrateKbps = 64;
    const sampleRate = 22050;
    const padding = 0;

    const size = computeFrameSize({
      bitrateKbps,
      sampleRate,
      padding,
      mpegVersion: 2
    });

    const expected =
      Math.floor((FRAME_SIZE_COEFFICIENT_MPEG2 * bitrateKbps) / sampleRate) + padding;

    expect(size).toBe(expected);
  });

  test("uses MPEG2 coefficient for MPEG2.5 Layer III", () => {
    const bitrateKbps = 32;
    const sampleRate = 11025;
    const padding = 0;

    const size = computeFrameSize({
      bitrateKbps,
      sampleRate,
      padding,
      mpegVersion: 2.5
    });

    const expected =
      Math.floor((FRAME_SIZE_COEFFICIENT_MPEG2 * bitrateKbps) / sampleRate) + padding;

    expect(size).toBe(expected);
  });

  test("includes padding bit for MPEG2/2.5 Layer III", () => {
    const bitrateKbps = 64;
    const sampleRate = 22050;
    const padding = 1;

    const size = computeFrameSize({
      bitrateKbps,
      sampleRate,
      padding,
      mpegVersion: 2
    });

    const expected =
      Math.floor((FRAME_SIZE_COEFFICIENT_MPEG2 * bitrateKbps) / sampleRate) + padding;

    expect(size).toBe(expected);
  });

  test("produces finite, positive frame sizes for representative supported combos", () => {
    const cases = [
      // MPEG-1 Layer III
      { mpegVersion: 1 as const, bitrateKbps: 128, sampleRate: 44100 },
      { mpegVersion: 1 as const, bitrateKbps: 192, sampleRate: 48000 },
      { mpegVersion: 1 as const, bitrateKbps: 320, sampleRate: 32000 },

      // MPEG-2 Layer III (sample rates base / 2)
      { mpegVersion: 2 as const, bitrateKbps: 64, sampleRate: 22050 },
      { mpegVersion: 2 as const, bitrateKbps: 96, sampleRate: 24000 },
      { mpegVersion: 2 as const, bitrateKbps: 160, sampleRate: 16000 },

      // MPEG-2.5 Layer III (sample rates base / 4)
      { mpegVersion: 2.5 as const, bitrateKbps: 32, sampleRate: 11025 },
      { mpegVersion: 2.5 as const, bitrateKbps: 40, sampleRate: 12000 },
      { mpegVersion: 2.5 as const, bitrateKbps: 48, sampleRate: 8000 }
    ];

    for (const { mpegVersion, bitrateKbps, sampleRate } of cases) {
      const size = computeFrameSize({
        bitrateKbps,
        sampleRate,
        padding: 0,
        mpegVersion
      });

      expect(Number.isFinite(size)).toBe(true);
      expect(size).toBeGreaterThan(0);
    }
  });
});
