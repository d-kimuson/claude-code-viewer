#!/usr/bin/env node

import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";

const args = process.argv.slice(2);
const [locale, key, ...translationParts] = args;

if (!locale || !key || translationParts.length === 0) {
  console.error(
    "Usage: scripts/put-transtation.js <locale> <key> <translation>",
  );
  process.exit(1);
}

const translation = translationParts.join(" ");
const messagesPath = `src/lib/i18n/locales/${locale}/messages.json`;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const updateTranslation = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const contents = yield* fs.readFileString(messagesPath);
  const data = JSON.parse(contents);

  if (!isRecord(data)) {
    return yield* Effect.fail(
      new Error(`Invalid JSON structure in ${messagesPath}`),
    );
  }

  const existing = data[key];

  if (typeof existing === "string") {
    data[key] = translation;
  } else if (isRecord(existing) && typeof existing.translation === "string") {
    existing.translation = translation;
  } else {
    return yield* Effect.fail(
      new Error(`Key not found or unsupported shape: ${key}`),
    );
  }

  const updated = `${JSON.stringify(data, null, 2)}\n`;
  yield* fs.writeFileString(messagesPath, updated);
});

Effect.runPromise(
  updateTranslation.pipe(Effect.provide(NodeFileSystem.layer)),
).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
