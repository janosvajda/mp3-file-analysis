import fp from "fastify-plugin";
import { constants as http2 } from "node:http2";
import type { FastifyInstance } from "fastify";

const FILE_TOO_LARGE_CODES = new Set<string>([
  "FST_REQ_FILE_TOO_LARGE",
  "FST_FILES_LIMIT",
  "FST_MULTIPART_FIELD_TOO_LARGE",
  "FST_REQ_BODY_TOO_LARGE"
]);

type FastifyErrorShape = {
  code?: string;
  statusCode?: number;
  message?: unknown;
};

type LogLevel = "warn" | "error";

const {
  HTTP_STATUS_INTERNAL_SERVER_ERROR: STATUS_INTERNAL,
  HTTP_STATUS_BAD_REQUEST: STATUS_BAD_REQUEST,
  HTTP_STATUS_PAYLOAD_TOO_LARGE: STATUS_TOO_LARGE
} = http2;

const DEFAULT_ERROR_MESSAGE = "Unexpected server error.";
const FILE_TOO_LARGE_MESSAGE = "File too large.";

export class MpAnalyseError extends Error {
  constructor(
    message: string,
    public statusCode: number = STATUS_BAD_REQUEST
  ) {
    super(message);
    this.name = "MpAnalyseError";
  }
}

const getErrorMessage = (error: FastifyErrorShape): string | undefined =>
  typeof error.message === "string" ? error.message : undefined;

export function isFileTooLargeError(error: unknown): error is FastifyErrorShape {
  if (!error || typeof error !== "object") return false;

  const { code, statusCode } = error as FastifyErrorShape;

  const hasOversizeCode = !!code && FILE_TOO_LARGE_CODES.has(code);
  const hasOversizeStatus = statusCode === STATUS_TOO_LARGE;

  return hasOversizeCode || hasOversizeStatus;
}

function normalizeError(error: unknown) {
  const err = error as FastifyErrorShape;
  const isMpAnalyse = error instanceof MpAnalyseError;
  const isFileTooLarge =
    isFileTooLargeError(error) || err.statusCode === STATUS_TOO_LARGE;
  const extractedMessage = getErrorMessage(err);

  let statusCode = STATUS_INTERNAL;
  let message = DEFAULT_ERROR_MESSAGE;
  let logLevel: LogLevel = "error";

  if (isFileTooLarge) {
    statusCode = STATUS_TOO_LARGE;
    message = FILE_TOO_LARGE_MESSAGE;
    logLevel = "warn";
  } else if (isMpAnalyse && extractedMessage) {
    statusCode = err.statusCode ?? STATUS_BAD_REQUEST;
    message = extractedMessage;
    logLevel = "warn";
  }

  return { statusCode, message, logLevel };
}

type NormalizedError = ReturnType<typeof normalizeError>;

/**
 * Fastify plugin to normalize error responses.
 *
 * - Known client errors (upload validation/processing) return 400 with their message.
 * - Oversize uploads return 413 with a simple message.
 * - Everything else returns 500 with a generic message.
 */
function errorHandlerPlugin(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error, request, reply) => {
    const { statusCode, message, logLevel }: NormalizedError = normalizeError(error);

    const logger = request.log;
    logger[logLevel]?.({ err: error }, "Unhandled error");

    reply.code(statusCode).send({ error: message });
  });
}

export const errorHandler = fp(errorHandlerPlugin, {
  name: "error-handler",
  encapsulate: false
});
