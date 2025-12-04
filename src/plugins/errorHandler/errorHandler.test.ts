import { describe, expect, test } from "vitest";
import Fastify from "fastify";
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
});
