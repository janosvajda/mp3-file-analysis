import type { FastifyBaseLogger } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { MpAnalyseError } from "../../errorHandler/errorHandler";

type Mp3Mimetype = "audio/mpeg" | "audio/mp3" | "audio/mpg";

const ALLOWED_MIME_TYPES = new Set<Mp3Mimetype>([
  "audio/mpeg",
  "audio/mp3",
  "audio/mpg"
]);

const EXPECTED_FIELD_NAME = "file";
/**
 * First byte of the MPEG audio frame sync.
 * All MP3 frames begin with 0xFF (1111 1111).
 */
const MP3_FRAME_SYNC_BYTE = 0xff;

/**
 * Minimum buffer size required to safely inspect an MP3 header.
 *
 * - 3 bytes needed to check for "ID3".
 * - 2 bytes needed to check MPEG frame sync.
 * - 4 bytes chosen to guarantee safe indexing and avoid false positives.
 */
const MP3_MIN_HEADER_BYTES = 4;


/**
 * Checks whether the buffer begins with a valid MP3 header signature.
 *
 * An MP3 file can start in two ways:
 *  1. "ID3" — an ID3v2 metadata tag.
 *  2. A raw MPEG audio frame beginning with the 11-bit frame sync:
 *        11111111111xxxx...
 *
 * The binary check verifies:
 *  - First byte is 0xFF.
 *  - Next byte has its top 3 bits set to 111 (mask 0b1110_0000).
 *
 * @param buffer The file's byte content.
 * @returns true if buffer likely contains a valid MP3 header.
 */
function isValidMp3Header(buffer: Buffer): boolean {
  // 1) ID3 tag header ("ID3" = metadata block)
  const startsWithId3 = buffer.toString("ascii", 0, 3) === "ID3";

  // 2) MPEG audio frame sync: 0xFF followed by byte starting with 111xxxxx
  const hasFrameSync =
    buffer[0] === MP3_FRAME_SYNC_BYTE &&
    (buffer[1] & 0b1110_0000) === 0b1110_0000;

  return startsWithId3 || hasFrameSync;
}


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
 */
export async function validateUpload(
  file: MultipartFile,
  log: FastifyBaseLogger
): Promise<Buffer> {
  if (file.fieldname !== EXPECTED_FIELD_NAME) {
    log.warn({ field: file.fieldname }, "Unexpected field name");
    throw new MpAnalyseError(`File field must be named '${EXPECTED_FIELD_NAME}'.`);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype as Mp3Mimetype)) {
    log.warn({ mimetype: file.mimetype }, "Unsupported MIME type");
    throw new MpAnalyseError("Unsupported file type. Only MP3 is allowed.");
  }

  const buffer = await file.toBuffer();

  if (buffer.length < MP3_MIN_HEADER_BYTES) {
    log.warn("Uploaded file is too small to be a valid MP3");
    throw new MpAnalyseError("Invalid MP3 file.");
  }

  if (!isValidMp3Header(buffer)) {
    log.warn("Uploaded file failed MP3 header sniff");
    throw new MpAnalyseError("Invalid MP3 file content.");
  }

  return buffer;
}