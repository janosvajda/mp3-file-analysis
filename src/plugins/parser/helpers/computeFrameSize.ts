import type { FrameHeader } from "./parseFrameHeader";

/**
 * MPEG Layer III frame size coefficients.
 *
 * These constants come directly from the official MPEG specifications:
 *
 *   • ISO/IEC 11172-3  (MPEG-1 Audio Layer III)
 *   • ISO/IEC 13818-3  (MPEG-2 Audio Layer III)
 *
 * The MPEG Layer III frame size formula defined in those specs is:
 *
 *      frame_size =
 *          floor( (144 * bitrate) / sample_rate ) + padding        // MPEG-1
 *
 * Formula (per ISO/IEC 11172-3 and ISO/IEC 13818-3):
 *
 * https://www.iso.org/obp/ui/es/#iso:std:iso-iec:13818:-3:ed-2:v1:en
 * https://cdn.standards.iteh.ai/samples/26797/8ab8b721c096433dbd8a6be67cd9d79e/ISO-IEC-13818-3-1998.pdf
 *
 *
 * When bitrate is given in kilobits per second (kbps), it converts
 * to bits per second by multiplying by 1000:
 *
 *      bitrate_bps = bitrate_kbps * 1000
 *
 * Substituting that into the formula yields:
 *
 *      frame_size =
 *          floor( (144000 * bitrate_kbps) / sample_rate ) + padding
 *
 * Therefore, the MPEG-1 coefficient is:
 *      144000  = 144 * 1000
 *
 * ------------------------------------------------------------------
 * MPEG-2 / MPEG-2.5
 * ------------------------------------------------------------------
 *
 * For MPEG-2 and MPEG-2.5, the sample rate is half (v2) or quarter (v2.5)
 * of the MPEG-1 sample rate. The specification defines the frame size
 * formula as using HALF of the MPEG-1 scaling:
 *
 *      frame_size =
 *          floor( (72000 * bitrate_kbps) / sample_rate ) + padding
 *
 * Because of this:
 *
 *      72000 = 144000 / 2
 *
 * MPEG-2.5 uses the same coefficient as MPEG-2.
 */

export const FRAME_SIZE_COEFFICIENT = 144000; // MPEG-1 Layer III
export const FRAME_SIZE_COEFFICIENT_MPEG2 = 72000; // MPEG-2 / MPEG-2.5 Layer III

export function computeFrameSize({
  bitrateKbps,
  sampleRate,
  padding,
  mpegVersion
}: Pick<FrameHeader, "bitrateKbps" | "sampleRate" | "padding" | "mpegVersion">): number {
  const coefficient = mpegVersion === 1 ? FRAME_SIZE_COEFFICIENT : FRAME_SIZE_COEFFICIENT_MPEG2;

  return Math.floor((coefficient * bitrateKbps) / sampleRate) + padding;
}
