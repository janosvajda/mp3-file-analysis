import { expect, test } from "vitest";
import { buildServer } from "./server";

const boundary = "----mp3-test-boundary";

/**
 * Builds a raw multipart/form-data payload for a single file field named "file".
 *
 * The structure is:
 *  --<boundary>\r\n
 *  Content-Disposition: form-data; name="file"; filename="test.mp3"\r\n
 *  Content-Type: audio/mpeg\r\n
 *  \r\n
 *  <file bytes>
 *  \r\n--<boundary>--\r\n
 *
 * @param fileBuffer The contents of the MP3 file.
 * @returns A Buffer containing the full multipart body.
 */
const buildMultipartPayload = (fileBuffer: Buffer) => {
  const CRLF = "\r\n";
  const preamble =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="test.mp3"${CRLF}` +
    `Content-Type: audio/mpeg${CRLF}${CRLF}`;
  const closing = `${CRLF}--${boundary}--${CRLF}`;
  return Buffer.concat([Buffer.from(preamble, "utf8"), fileBuffer, Buffer.from(closing, "utf8")]);
};

// Minimal synthetic MPEG1 Layer III frame: 128 kbps, 44100 Hz, no padding.
/**
 * Builds a minimal synthetic MP3 buffer containing a single MPEG-1 Layer III frame.
 *
 * The frame is:
 *  - MPEG Version 1
 *  - Layer III
 *  - 128 kbps bitrate
 *  - 44100 Hz sample rate
 *  - No padding
 *
 * The frame size is computed using the standard formula:
 *   floor((144000 * bitrateKbps) / sampleRate)
 *
 * @returns A Buffer representing a single-frame MP3 file.
 */
const buildSyntheticMp3 = (): Buffer => {
  const header = Buffer.alloc(4);
  let value = 0xffe00000; // sync
  value |= 0b11 << 19; // MPEG Version 1
  value |= 0b01 << 17; // Layer III
  value |= 0b1 << 16; // no CRC
  value |= 0b1001 << 12; // 128 kbps
  value |= 0b00 << 10; // 44100 Hz
  value |= 0b0 << 9; // no padding
  value |= 0b00 << 6; // stereo
  value >>>= 0;
  header.writeUInt32BE(value, 0);

  const frameSize = Math.floor((144000 * 128) / 44100);
  const payload = Buffer.alloc(frameSize - 4, 0);
  return Buffer.concat([header, payload]);
};

test("returns 400 when no file is uploaded", async () => {
  const server = buildServer("error");
  const response = await server.inject({
    method: "POST",
    url: "/file-upload",
    headers: {
      "content-type": "multipart/form-data; boundary=" + boundary
    },
    payload: Buffer.from(`--${boundary}--\r\n`)
  });

  expect(response.statusCode).toBe(400);
});

test("counts frames for a valid MP3 upload", async () => {
  const server = buildServer("error");
  const fileBuffer = buildSyntheticMp3();
  const payload = buildMultipartPayload(fileBuffer);

  const response = await server.inject({
    method: "POST",
    url: "/file-upload",
    payload,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    }
  });

  expect(response.statusCode).toBe(200);
  const json = response.json();
  expect(json.frameCount).toBe(1);
});
