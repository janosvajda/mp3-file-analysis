import { expect, test, vi } from "vitest";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyBaseLogger } from "fastify";
import { validateUpload } from "./uploadValidator";

const logger: FastifyBaseLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  level: "info",
  child: vi.fn().mockReturnThis()
} as unknown as FastifyBaseLogger;

const buildFile = (overrides: Partial<MultipartFile> & { buffer?: Buffer }) => {
  const buffer = overrides.buffer ?? Buffer.from("ID3dummy");
  return {
    fieldname: "file",
    mimetype: "audio/mpeg",
    toBuffer: vi.fn().mockResolvedValue(buffer),
    ...overrides
  } as unknown as MultipartFile;
};

test("accepts valid file with ID3 header", async () => {
  const file = buildFile({ buffer: Buffer.from("ID3example") });
  const result = await validateUpload(file, logger);
  expect(result).toBeInstanceOf(Buffer);
});

test("rejects wrong field name", async () => {
  const file = buildFile({ fieldname: "wrong" });
  await expect(validateUpload(file, logger)).rejects.toThrow(/File field must be named/);
});

test("rejects unsupported mimetype", async () => {
  const file = buildFile({ mimetype: "application/octet-stream" });
  await expect(validateUpload(file, logger)).rejects.toThrow(/Unsupported file type/);
});

test("rejects truncated uploads with size message", async () => {
  const file = buildFile({
    buffer: Buffer.alloc(10),
    mimetype: "audio/mpeg",
    file: { truncated: true }
  } as unknown as MultipartFile);

  await expect(validateUpload(file, logger, 1024 * 1024)).rejects.toThrow(
    /File exceeds the maximum allowed size/
  );
});

test("rejects when bytesRead exceeds max size", async () => {
  const file = buildFile({
    buffer: Buffer.alloc(10),
    mimetype: "audio/mpeg",
    file: { bytesRead: 2 * 1024 * 1024 }
  } as unknown as MultipartFile);

  await expect(validateUpload(file, logger, 1024 * 1024)).rejects.toThrow(
    /File exceeds the maximum allowed size/
  );
});

test("rejects when truncated flag is set", async () => {
  const file = buildFile({
    buffer: Buffer.alloc(10),
    mimetype: "audio/mpeg",
    truncated: true
  } as unknown as MultipartFile);

  await expect(validateUpload(file, logger, 1024 * 1024)).rejects.toThrow(
    /File exceeds the maximum allowed size/
  );
});

test("rejects buffer exceeding explicit max size", async () => {
  const file = buildFile({ buffer: Buffer.alloc(2 * 1024 * 1024) });
  await expect(validateUpload(file, logger, 1024 * 1024)).rejects.toThrow(
    /File exceeds the maximum allowed size/
  );
});

test("rejects too-small buffers", async () => {
  const file = buildFile({ buffer: Buffer.alloc(2) });
  await expect(validateUpload(file, logger)).rejects.toThrow(/Invalid MP3 file/);
});

test("rejects when content sniff fails", async () => {
  const file = buildFile({ buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]) });
  await expect(validateUpload(file, logger)).rejects.toThrow(/Invalid MP3 file content/);
});
