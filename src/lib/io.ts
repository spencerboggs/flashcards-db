import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import YAML from "yaml";
import type { z } from "zod";

export class SourceFileError extends Error {
  constructor(
    public readonly file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
  }
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function exists(path: string): boolean {
  return existsSync(path);
}

export function readText(path: string): string {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

export function writeText(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return false;
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
  return true;
}

export function readJson<T = unknown>(path: string): T {
  try {
    return JSON.parse(readText(path)) as T;
  } catch (error) {
    throw new SourceFileError(path, `invalid JSON: ${(error as Error).message}`);
  }
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.length ? issue.path.join(".") : "(root)"}: ${issue.message}`)
    .join("\n");
}

export function parseWith<S extends z.ZodType>(schema: S, value: unknown, file: string): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new SourceFileError(file, `schema validation failed:\n${formatZodError(result.error)}`);
  return result.data;
}

export function readYaml<S extends z.ZodType>(path: string, schema: S): z.output<S> {
  if (!existsSync(path)) return parseWith(schema, {}, path);
  let raw: unknown;
  try {
    raw = YAML.parse(readText(path)) ?? {};
  } catch (error) {
    throw new SourceFileError(path, `invalid YAML: ${(error as Error).message}`);
  }
  return parseWith(schema, raw, path);
}

export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
