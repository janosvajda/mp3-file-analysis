import { constants as http2 } from "node:http2";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { validateUpload } from "../parser/validators/uploadValidator";
import {
  UPLOAD_VALIDATION_ERROR_CODE,
  isFileTooLargeError,
  mp3ParseError
} from "../../support/errors";

type Analyzer = {
  countMp3Frames: (buffer: Buffer) => number;
};

type FileUploadPluginOptions = {
  analyzer: Analyzer;
  maxFileSizeBytes?: number;
};

/**
 * Fastify plugin registering the `/file-upload` endpoint.
 */
function fileUploadPlugin(
  server: FastifyInstance,
  analyzer: Analyzer,
  maxFileSizeBytes?: number
): void {
  server.post("/file-upload", async (request, reply) => {
    let file;
    try {
      file = await request.file();
    } catch (err) {
      if (isFileTooLargeError(err)) {
        throw err;
      }
      throw err;
    }

    if (!file) {
      request.log.warn("No file provided in /file-upload");
      reply.code(http2.HTTP_STATUS_BAD_REQUEST);
      return { error: "No file uploaded." };
    }

    try {
      const buffer = await validateUpload(file, request.log, maxFileSizeBytes);
      const frameCount = analyzer.countMp3Frames(buffer);

      reply
        .code(http2.HTTP_STATUS_OK)
        .header("Content-Type", "application/json");

      return { frameCount };
    } catch (error) {
      if ((error as { code?: string }).code === UPLOAD_VALIDATION_ERROR_CODE) {
        throw error;
      }
      if (isFileTooLargeError(error)) {
        throw error;
      }
      // Treat parser/analyzer failures as client errors with a safe message.
      throw new mp3ParseError("Invalid MP3 file.");
    }
  });
}

export const fileUploadRoutes = fp<FileUploadPluginOptions>(
  (server: FastifyInstance, options: FileUploadPluginOptions) => {
    fileUploadPlugin(server, options.analyzer, options.maxFileSizeBytes);
  }
);
