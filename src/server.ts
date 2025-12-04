import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import dotenv from "dotenv";
import { createFrameAnalyzer } from "./mp3";
import { registerFileUploadRoute } from "./routes/fileUpload";

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

  registerFileUploadRoute(server, analyzer);

  return server;
}

if (require.main === module) {
  const server = buildServer();
  server.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
    server.log.error(err);
    process.exit(1);
  });
}
