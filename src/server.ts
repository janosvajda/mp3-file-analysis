import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { constants as http2 } from "node:http2";
import dotenv from "dotenv";
import { createFrameAnalyzer } from "./mp3";

dotenv.config();

const DEFAULT_MAX_FILE_SIZE_MB = 20; // 20 MB
const DEFAULT_PORT = 3000;
const BYTES_PER_MB = 1024 * 1024;

const maxFileSizeMb =
  Number(process.env.MAX_FILE_SIZE_MB) > 0 && Number.isFinite(Number(process.env.MAX_FILE_SIZE_MB))
    ? Number(process.env.MAX_FILE_SIZE_MB)
    : DEFAULT_MAX_FILE_SIZE_MB;

const MAX_FILE_SIZE_BYTES = maxFileSizeMb * BYTES_PER_MB;

const PORT =
  Number(process.env.PORT) > 0 && Number.isFinite(Number(process.env.PORT))
    ? Number(process.env.PORT)
    : DEFAULT_PORT;

/**
 * - Accepts a single uploaded file via multipart/form-data.
 * - Treats the file as an MP3 and counts its MPEG audio frames.
 * - Returns `{ frameCount }` on success.
 * - Returns `{ error }` with HTTP 400 on validation or processing errors.
 */
export function buildServer(
  loggerLevel: "info" | "warn" | "error" = "info"
): FastifyInstance {
  const server = Fastify({
    logger: { level: loggerLevel }
  });

  const analyzer = createFrameAnalyzer({
    info: (msg: string) => server.log.info(msg)
  });

  server.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES
    }
  });

  server.post("/file-upload", async (request, reply) => {
    const file = await request.file();

    if (!file) {
      request.log.warn("No file provided in /file-upload");
      reply.code(http2.HTTP_STATUS_BAD_REQUEST);
      return { error: "No file uploaded." };
    }

    try {
      const buffer = await file.toBuffer();
      const frameCount = analyzer.countMp3Frames(buffer);

      reply.code(http2.HTTP_STATUS_OK).header("Content-Type", "application/json");
      return { frameCount };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to process MP3 file.";

      request.log.error({ err: error }, "Failed to process MP3 upload");

      reply.code(http2.HTTP_STATUS_BAD_REQUEST);
      return { error: message };
    }
  });

  return server;
}

if (require.main === module) {
  const server = buildServer();
  server.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
    server.log.error(err);
    process.exit(1);
  });
}
