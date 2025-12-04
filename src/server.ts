import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { constants as http2 } from "node:http2";
import { createFrameAnalyzer } from "./mp3";

const server = Fastify({
  logger: true
});

const analyzer = createFrameAnalyzer({
  info: (msg: string) => server.log.info(msg)
});

server.register(multipart, {
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  }
});

server.post("/file-upload", async (request, reply) => {
  const file = await request.file();

  if (!file) {
    reply.code(http2.HTTP_STATUS_BAD_REQUEST);
    return { error: "No file uploaded." };
  }

  try {
    const buffer = await file.toBuffer();
    const frameCount = analyzer.countMp3Frames(buffer);

    reply.code(http2.HTTP_STATUS_OK).header("Content-Type", "application/json");
    return { frameCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process MP3 file.";
    reply.code(http2.HTTP_STATUS_BAD_REQUEST);
    return { error: message };
  }
});

const port = Number(process.env.PORT ?? 3000);

server.listen({ port, host: "0.0.0.0" }).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
