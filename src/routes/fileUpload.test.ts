import { expect, test, vi } from "vitest";
import { constants as http2 } from "node:http2";
import type { FastifyRequest } from "fastify";
import { registerFileUploadRoute } from "./fileUpload";
import * as uploadValidator from "../mp3/validators/uploadValidator";

const buildReply = () => {
  const reply = {
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis()
  };
  return reply as unknown as {
    code: (status: number) => typeof reply;
    header: (name: string, value: string) => typeof reply;
  };
};

test("returns 400 when no file is provided", async () => {
  const server = {
    post: vi.fn((path, handler) => {
      // simulate handler call with no file
      const request = {
        file: async () => undefined,
        log: { warn: vi.fn(), error: vi.fn() }
      } as unknown as FastifyRequest;

      const reply = buildReply();
      return handler(request, reply);
    })
  };

  // dummy analyzer
  const analyzer = { countMp3Frames: vi.fn() };

  registerFileUploadRoute(server as any, analyzer as any);

  expect(server.post).toHaveBeenCalledWith("/file-upload", expect.any(Function));
  const lastCall = server.post.mock.calls[0];
  const handler = lastCall[1];

  const request = {
    file: async () => undefined,
    log: { warn: vi.fn(), error: vi.fn() }
  } as unknown as FastifyRequest;
  const reply = buildReply();

  const result = await handler(request, reply);
  expect(reply.code).toHaveBeenCalledWith(http2.HTTP_STATUS_BAD_REQUEST);
  expect(result).toEqual({ error: "No file uploaded." });
});

test("uses analyzer when upload validation succeeds", async () => {
  const mockFile = { toBuffer: vi.fn() };
  const request = {
    file: async () => mockFile,
    log: { warn: vi.fn(), error: vi.fn() }
  } as unknown as FastifyRequest;

  const reply = buildReply();
  const analyzer = { countMp3Frames: vi.fn().mockReturnValue(42) };

  const server = {
    post: vi.fn((path, handler) => handler)
  };

  const validatedBuffer = Buffer.from("ok");
  vi.spyOn(uploadValidator, "validateUpload").mockResolvedValue(validatedBuffer);

  registerFileUploadRoute(server as any, analyzer as any);
  const handler = server.post.mock.results[0].value as unknown as (
    req: FastifyRequest,
    res: any
  ) => Promise<any>;

  const result = await handler(request, reply);

  expect(analyzer.countMp3Frames).toHaveBeenCalledWith(validatedBuffer);
  expect(reply.code).toHaveBeenCalledWith(http2.HTTP_STATUS_OK);
  expect(result).toEqual({ frameCount: 42 });
});
