import type { FastifyBaseLogger } from "fastify";
import type { MultipartFile } from "@fastify/multipart";

const ALLOWED_MIME_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/mpg"]);
const EXPECTED_FIELD_NAME = "file";
const MP3_SYNC_BYTE = 0xff;
const MIN_MP3_BYTES = 4;

/**
 * Validates an uploaded file as an MP3 and returns its Buffer.
 *
 * Validation checks:
 *  - Field name must match the expected `"file"` field.
 *  - MIME type must be one of the allowed MP3 types.
 *  - File must be at least 4 bytes long.
 *  - Content must look like an MP3:
 *      - either start with "ID3" (ID3v2 tag), or
 *      - start with 0xFF followed by a byte whose top 3 bits are 111 (frame sync).
 *
 * On failure, logs a warning and throws an Error with a user-facing message.
 *
 * @param file The uploaded multipart file.
 * @param log  Fastify logger for warnings.
 * @returns The file contents as a Buffer if validation passes.
 */
export async function validateUpload(
  file: MultipartFile,
  log: FastifyBaseLogger
): Promise<Buffer> {
  if (file.fieldname !== EXPECTED_FIELD_NAME) {
    log.warn({ field: file.fieldname }, "Unexpected field name");
    throw new Error(`File field must be named '${EXPECTED_FIELD_NAME}'.`);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    log.warn({ mimetype: file.mimetype }, "Unsupported MIME type");
    throw new Error("Unsupported file type. Only MP3 is allowed.");
  }

  const buffer = await file.toBuffer();

  if (buffer.length < MIN_MP3_BYTES) {
    log.warn("Uploaded file is too small to be a valid MP3");
    throw new Error("Invalid MP3 file.");
  }

  const startsWithId3 = buffer.toString("ascii", 0, 3) === "ID3";
  const startsWithSync =
    buffer[0] === MP3_SYNC_BYTE && (buffer[1] & 0b11100000) === 0b11100000;

  if (!startsWithId3 && !startsWithSync) {
    log.warn("Uploaded file failed MP3 header sniff");
    throw new Error("Invalid MP3 file content.");
  }

  return buffer;
}
