#!/usr/bin/env node
// Assemble a production-only, allowlisted Cloudflare Pages asset directory.
// Pages Functions are kept at the repository root for Wrangler to bundle.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFile, mkdir, readdir, rm, stat, readFile } from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const publicFiles = ["index.html", "styles.css", "bundle.js", "_headers", "_redirects"];

async function requireFile(filename) {
  const source = path.join(root, filename);
  const info = await stat(source).catch(() => null);
  if (!info?.isFile()) throw new Error(`Required public asset is missing: ${filename}`);
  return source;
}

async function main() {
  const html = await readFile(await requireFile("index.html"), "utf8");
  for (const reference of ['href="styles.css"', 'src="bundle.js"']) {
    if (!html.includes(reference)) throw new Error(`index.html is missing asset reference ${reference}`);
  }
  for (const filename of publicFiles) await requireFile(filename);

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const filename of publicFiles) {
    await copyFile(path.join(root, filename), path.join(output, filename));
  }

  const actual = (await readdir(output)).sort();
  const expected = [...publicFiles].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected Pages output contents: ${actual.join(", ")}`);
  }
  console.log(`Cloudflare Pages output prepared at ${output}`);
  console.log(`Allowlisted assets: ${actual.join(", ")}`);
  console.log("Server source, tests, SQL and deployment configuration are excluded.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
