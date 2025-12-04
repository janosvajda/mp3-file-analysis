import fp from "fastify-plugin";
import { constants as http2 } from "node:http2";
import type { FastifyInstance } from "fastify";
import {
  MP3_PARSE_ERROR_CODE,
  UPLOAD_VALIDATION_ERROR_CODE,
  formatFileTooLargeMessage,
  isFileTooLargeError
} from "../../support/errors";

type ErrorHandlerOptions = {
  maxFileSizeBytes?: number;
};

/**
 * Fastify plugin to normalize error responses.
 *
 * - Known client errors (upload validation/processing) return 400 with their message.
 * - Oversize uploads return 413 with a friendly limit message.
 * - Everything else returns 500 with a generic message.
 */
function errorHandlerPlugin(
  fastify: FastifyInstance,
  options: ErrorHandlerOptions = {}
): void {
  const STATUS_INTERNAL = Number(http2?.HTTP_STATUS_INTERNAL_SERVER_ERROR ?? 500);
  const STATUS_BAD_REQUEST = Number(http2?.HTTP_STATUS_BAD_REQUEST ?? 400);
  const STATUS_TOO_LARGE = Number(http2?.HTTP_STATUS_PAYLOAD_TOO_LARGE ?? 413);

  const maxFileSizeBytes = options.maxFileSizeBytes;
  const clientErrorCodes = new Set([UPLOAD_VALIDATION_ERROR_CODE, MP3_PARSE_ERROR_CODE]);

  fastify.setErrorHandler((error, request, reply) => {
    const code = (error as { code?: string }).code;
    const status = (error as { statusCode?: number }).statusCode;
    const isClientError = code ? clientErrorCodes.has(code) : false;
    const isFileTooLarge = isFileTooLargeError(error) || status === STATUS_TOO_LARGE;

    const extractedMessage =
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message?: string }).message
        : undefined;

    let statusCode = STATUS_INTERNAL;
    let message = "Unexpected server error.";

    if (isClientError && extractedMessage) {
      statusCode = STATUS_BAD_REQUEST;
      message = extractedMessage;
    } else if (isFileTooLarge) {
      statusCode = STATUS_TOO_LARGE;
      message = extractedMessage ?? formatFileTooLargeMessage(maxFileSizeBytes);
    }

    const logMethod = isClientError || isFileTooLarge ? "warn" : "error";
    (request.log as unknown as Record<string, (obj: unknown, msg: string) => void>)[logMethod]?.(
      { err: error },
      "Unhandled error"
    );

    reply.code(statusCode).send({ error: message });
  });
}

export const errorHandler = fp<ErrorHandlerOptions>(errorHandlerPlugin, {
  name: "error-handler",
  encapsulate: false
});
