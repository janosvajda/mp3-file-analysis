import { constants as http2 } from "node:http2";
import type { FastifyInstance } from "fastify";
import { validateUpload } from "../mp3/validators/uploadValidator";

type Analyzer = {
  countMp3Frames: (buffer: Buffer) => number;
};

/**
 * Registers the `/file-upload` endpoint on the provided Fastify server.
 *
 * - Accepts a multipart upload containing a single file under the "file" field.
 * - Validates and extracts the file buffer via `validateUpload`.
 * - Counts MP3 frames using the provided analyzer.
 * - Returns `{ frameCount }` on success (HTTP 200).
 * - Returns `{ error }` on validation or processing failure (HTTP 400).
 *
 * @param server  Fastify instance on which to register the route.
 * @param analyzer Object providing the `countMp3Frames()` method.
 */
export function registerFileUploadRoute(server: FastifyInstance, analyzer: Analyzer): void {
  server.post("/file-upload", async (request, reply) => {
    const file = await request.file();

    if (!file) {
      request.log.warn("No file provided in /file-upload");
      reply.code(http2.HTTP_STATUS_BAD_REQUEST);
      return { error: "No file uploaded." };
    }

    try {
      const buffer = await validateUpload(file, request.log);
      const frameCount = analyzer.countMp3Frames(buffer);

      reply
        .code(http2.HTTP_STATUS_OK)
        .header("Content-Type", "application/json");

      return { frameCount };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to process MP3 file.";

      request.log.error({ err: error }, "Failed to process MP3 upload");

      reply.code(http2.HTTP_STATUS_BAD_REQUEST);
      return { error: message };
    }
  });
}
