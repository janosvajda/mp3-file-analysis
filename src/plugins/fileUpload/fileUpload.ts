import { constants as http2 } from "node:http2";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { MpAnalyseError, isFileTooLargeError } from "../errorHandler/errorHandler";
import { validateUpload } from "./validators/uploadValidator";

type Analyzer = {
  countMp3Frames: (buffer: Buffer) => number;
};

type FileUploadPluginOptions = {
  analyzer: Analyzer;
  maxFileSizeBytes?: number;
};

const { HTTP_STATUS_PAYLOAD_TOO_LARGE: STATUS_TOO_LARGE, HTTP_STATUS_OK: STATUS_OK } = http2;

/**
 * Fastify plugin registering the `/file-upload` endpoint.
 */
export const fileUploadRoutes = fp<FileUploadPluginOptions>(
  (server: FastifyInstance, { analyzer, maxFileSizeBytes }) => {
    server.post("/file-upload", async (request, reply) => {
      let file;
      try {
        file = await request.file();
      } catch (err) {
        request.log.warn({ err }, "Failed to parse multipart upload");
        throw new MpAnalyseError("No file uploaded.");
      }

      if (!file) {
        request.log.warn("No file provided in /file-upload");
        throw new MpAnalyseError("No file uploaded.");
      }

      const buffer = await validateUpload(file, request.log);

      if (maxFileSizeBytes && buffer.length > maxFileSizeBytes) {
        throw new MpAnalyseError("File too large.", STATUS_TOO_LARGE);
      }

      try {
        const frameCount = analyzer.countMp3Frames(buffer);

        reply.code(STATUS_OK).header("Content-Type", "application/json");

        return { frameCount };
      } catch (error) {
        if (error instanceof MpAnalyseError || isFileTooLargeError(error)) {
          throw error;
        }

        // Treat parser/analyzer failures as client errors with a safe message.
        throw new MpAnalyseError("Invalid MP3 file.");
      }
    });
  }
);
