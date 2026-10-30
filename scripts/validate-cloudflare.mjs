#!/usr/bin/env node
// Static checks for the Cloudflare Pages + API Worker deployment contract.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, readdir, stat } from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = filename => readFile(path.join(root, filename), "utf8");

async function main() {
  const [pages, worker, headers, middleware, app, bundle, keyHandler, sessionHandler] = await Promise.all([
    read("wrangler.toml"), read("wrangler.worker.toml"), read("_headers"),
    read("functions/api/_middleware.js"), read("app.js"), read("bundle.js"),
    read("functions/api/admin/keys.js"), read("functions/api/admin/session.js")
  ]);

  assert.match(pages, /pages_build_output_dir\s*=\s*["']\.\/dist["']/);
  assert.match(worker, /main\s*=\s*["']worker\/index\.js["']/);
  assert.doesNotMatch(worker, /assets\s*=\s*\{/);
  assert.match(pages, /\[\[d1_databases\]\]/);
  assert.match(worker, /\[\[d1_databases\]\]/);
  assert.match(middleware, /CORS_ALLOWED_ORIGINS/);
  assert.doesNotMatch(headers, /Access-Control-Allow-Origin:\s*\*/i);
  assert.match(keyHandler, /requireAdmin/);
  assert.match(sessionHandler, /createAdminSession/);
  assert.match(app, /api\/admin\/session/);
  assert.doesNotMatch(app, /careers2026/);
  assert.doesNotMatch(bundle, /careers2026/);
  assert.equal(app, bundle, "app.js and bundle.js must remain byte-identical");

  const dist = path.join(root, "dist");
  const info = await stat(dist).catch(() => null);
  assert.ok(info?.isDirectory(), "Run scripts/build-pages.mjs first.");
  const actual = (await readdir(dist)).sort();
  assert.deepEqual(actual, ["_headers", "_redirects", "bundle.js", "index.html", "styles.css"]);

  console.log("Cloudflare configuration checks passed.");
  console.log("Verified D1 bindings, CORS allowlist, secured admin endpoints and Pages allowlist.");
}

main().catch(error => {
  console.error("Cloudflare validation failed:", error);
  process.exitCode = 1;
});
