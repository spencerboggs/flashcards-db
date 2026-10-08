#!/usr/bin/env node
import { resolve } from "node:path";
import { REPO_ROOT, createPaths } from "../config.ts";
import { build, validate } from "../pipeline/build.ts";

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: string; flags: Flags } {
  const [command = "help", ...rest] = argv;
  const flags: Flags = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg?.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=", 2) as [string, string | undefined];
    if (value !== undefined) flags[key] = value;
    else if (rest[i + 1] && !rest[i + 1]!.startsWith("--")) flags[key] = rest[++i]!;
    else flags[key] = true;
  }
  return { command, flags };
}

const HELP = `CS Flashcards

Usage: npm run <command>

  validate        Check data/seeds against the schema and reference rules
                  --check-output  also require data/latest to match a fresh build
  build:data      Read the seeds and write data/latest

Cards are written in data/seeds.
`;

function pathsFrom(flags: Flags) {
  const root = typeof flags.root === "string" ? resolve(flags.root) : REPO_ROOT;
  return createPaths(root);
}

function main(): number {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command === "help" || flags.help === true) {
    console.log(HELP);
    return 0;
  }

  const paths = pathsFrom(flags);
  if (command === "validate") {
    const errors = validate(paths, flags["check-output"] === true);
    for (const error of errors) console.error(error);
    if (errors.length) return 1;
    console.log(flags["check-output"] === true ? "valid (seeds and data/latest)" : "valid (seeds)");
    return 0;
  }

  if (command === "build") {
    const result = build(paths);
    console.log(
      `built ${result.cards} cards, ${result.categories} categories, ${result.relationships} relationships` +
        ` (${result.written.length} written, ${result.deleted.length} deleted)`,
    );
    return 0;
  }

  console.error(HELP);
  return 1;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
