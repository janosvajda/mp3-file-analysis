import { constants as http2 } from "node:http2";
import createError from "@fastify/error";

export const UPLOAD_VALIDATION_ERROR_CODE = "UPLOAD_VALIDATION_ERROR";
export const MP3_PROCESSING_ERROR_CODE = "MP3_PROCESSING_ERROR";
export const MP3_PARSE_ERROR_CODE = "MP3_PARSE_ERROR";

const BYTES_PER_MB = 1024 * 1024;
const FILE_TOO_LARGE_CODES = new Set([
  "FST_REQ_FILE_TOO_LARGE",
  "FST_FILES_LIMIT",
  "FST_MULTIPART_FIELD_TOO_LARGE",
  "FST_REQ_BODY_TOO_LARGE"
]);

export const uploadValidationError = createError(
  UPLOAD_VALIDATION_ERROR_CODE,
  "%s",
  http2.HTTP_STATUS_BAD_REQUEST
);

export const mp3ProcessingError = createError(
  MP3_PROCESSING_ERROR_CODE,
  "%s",
  http2.HTTP_STATUS_INTERNAL_SERVER_ERROR
);
export const mp3ParseError = createError(
  MP3_PARSE_ERROR_CODE,
  "%s",
  http2.HTTP_STATUS_BAD_REQUEST
);

export function formatFileTooLargeMessage(maxFileSizeBytes?: number): string {
  const suffix =
    typeof maxFileSizeBytes === "number"
      ? ` of ${Math.round(maxFileSizeBytes / BYTES_PER_MB)} MB`
      : "";
  return `File exceeds the maximum allowed size${suffix}.`;
}

export function isFileTooLargeError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  const status = (error as { statusCode?: number } | undefined)?.statusCode;
  return (
    (code ? FILE_TOO_LARGE_CODES.has(code) : false) ||
    status === http2.HTTP_STATUS_PAYLOAD_TOO_LARGE
  );
}
