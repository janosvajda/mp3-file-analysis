import { describe, expect, test } from "vitest";
import Fastify from "fastify";
import { constants as http2 } from "node:http2";
import { errorHandler } from "./errorHandler";

describe("errorHandler plugin", () => {
  test("returns 500 with generic message for unexpected errors", async () => {
    const app = Fastify();

    await app.register(async (instance) => {
      await instance.register(errorHandler);
      instance.get("/boom", () => {
        throw new Error("Unexpected error");
      });
    });

    const response = await app.inject({
      method: "GET",
      url: "/boom"
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual({ error: "Unexpected server error." });
  });

  test("normalizes file-too-large errors to 413 with a simple message", async () => {
    const app = Fastify();

    await app.register(async (instance) => {
      await instance.register(errorHandler);
      instance.get("/too-large", () => {
        const err = new Error("File exceeds the maximum allowed size of 1 MB.");
        (err as { code?: string }).code = "FST_REQ_FILE_TOO_LARGE";
        throw err;
      });
    });

    const response = await app.inject({
      method: "GET",
      url: "/too-large"
    });

    expect(response.statusCode).toBe(http2.HTTP_STATUS_PAYLOAD_TOO_LARGE);
    expect(response.json()).toEqual({ error: "File too large." });
  });
});
