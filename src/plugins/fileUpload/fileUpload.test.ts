import { expect, test, vi } from "vitest";
import Fastify from "fastify";
import { constants as http2 } from "node:http2";
import { fileUploadRoutes } from "./fileUpload";
import * as uploadValidator from "./validators/uploadValidator";
import { errorHandler } from "../errorHandler/errorHandler";
import type { FastifyRequest } from "fastify";

const registerTestServer = async (analyzer: { countMp3Frames: (buffer: Buffer) => number }) => {
  const app = Fastify();
  await app.register(errorHandler);
  await app.register(fileUploadRoutes, { analyzer });
  return app;
};

const setRequestFile = (
  app: ReturnType<typeof Fastify>,
  fileFn: () => Promise<unknown>
) => {
  app.addHook("onRequest", (req: FastifyRequest, _reply: unknown, done: () => void) => {
    (req as unknown as { file?: () => Promise<unknown> }).file = fileFn;
    done();
  });
};

test("returns 400 when no file is provided", async () => {
  const app = await registerTestServer({ countMp3Frames: vi.fn() });
  setRequestFile(app, () => Promise.resolve(undefined));

  const response = await app.inject({
    method: "POST",
    url: "/file-upload"
  });

  expect(response.statusCode).toBe(http2.HTTP_STATUS_BAD_REQUEST);
  expect(response.json()).toEqual({ error: "No file uploaded." });
});

test("uses analyzer when upload validation succeeds", async () => {
  const validatedBuffer = Buffer.from("ok");
  vi.spyOn(uploadValidator, "validateUpload").mockResolvedValue(validatedBuffer);

  const analyzer = { countMp3Frames: vi.fn().mockReturnValue(42) };
  const app = await registerTestServer(analyzer);
  setRequestFile(app, () => Promise.resolve({}));

  const response = await app.inject({
    method: "POST",
    url: "/file-upload"
  });

  expect(analyzer.countMp3Frames).toHaveBeenCalledWith(validatedBuffer);
  expect(response.statusCode).toBe(http2.HTTP_STATUS_OK);
  expect(response.json()).toEqual({ frameCount: 42 });
});

test("returns 400 on analyzer errors with safe message", async () => {
  vi.spyOn(uploadValidator, "validateUpload").mockResolvedValue(Buffer.from("ok"));

  const analyzer = {
    countMp3Frames: vi.fn(() => {
      throw new Error("boom");
    })
  };
  const app = await registerTestServer(analyzer);
  setRequestFile(app, () => Promise.resolve({}));

  const response = await app.inject({
    method: "POST",
    url: "/file-upload"
  });

  expect(response.statusCode).toBe(http2.HTTP_STATUS_BAD_REQUEST);
  expect(response.json()).toEqual({ error: "Invalid MP3 file." });
});

test("returns 413 when validateUpload flags oversized file", async () => {
  const tooLargeError = new Error("File exceeds the maximum allowed size of 1 MB.");
  (tooLargeError as { code?: string }).code = "FST_REQ_FILE_TOO_LARGE";
  vi.spyOn(uploadValidator, "validateUpload").mockRejectedValue(tooLargeError);

  const analyzer = { countMp3Frames: vi.fn() };
  const app = await registerTestServer(analyzer);
  setRequestFile(app, () => Promise.resolve({}));

  const response = await app.inject({
    method: "POST",
    url: "/file-upload"
  });

  expect(response.statusCode).toBe(http2.HTTP_STATUS_PAYLOAD_TOO_LARGE);
  expect(response.json()).toEqual({ error: "File too large." });
});
