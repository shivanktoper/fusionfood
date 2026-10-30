// Protected Cloudflare Pages Function: /api/admin/keys
// Admin operations require a valid short-lived HttpOnly session.
import { requireAdmin } from "./_auth.js";
import { hashApiToken } from "../_api-auth.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function generateRandomHex(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0"))
    .join("").slice(0, length);
}

async function ensureKeysTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_token TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'read',
      status TEXT NOT NULL DEFAULT 'active',
      expires_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function authorize(context) {
  const auth = await requireAdmin(context);
  return auth.ok ? null : auth.response;
}

export async function onRequestGet(context) {
  const denied = await authorize(context);
  if (denied) return denied;
  const db = context.env?.DB;
  if (!db) return jsonResponse({ success: false, error: "Database binding (DB) not configured." }, 503);

  try {
    await ensureKeysTable(db);
    const result = await db.prepare(`
      SELECT id, key_id, name, key_prefix, scope, status, expires_at, created_at
      FROM api_keys
      ORDER BY created_at DESC
      LIMIT 100
    `).all();
    const keys = (result.results || []).map(row => ({
      id: row.id, keyId: row.key_id, name: row.name, prefix: row.key_prefix,
      scope: row.scope, status: row.status, expiresAt: row.expires_at,
      createdAt: row.created_at
    }));
    return jsonResponse({ success: true, count: keys.length, keys });
  } catch (error) {
    console.error("Unable to list API keys:", error);
    return jsonResponse({ success: false, error: "Failed to list API keys." }, 500);
  }
}

export async function onRequestPost(context) {
  const denied = await authorize(context);
  if (denied) return denied;
  const db = context.env?.DB;
  if (!db) return jsonResponse({ success: false, error: "Database binding (DB) not configured." }, 503);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON request body." }, 400);
  }

  const name = String(body?.name || body?.label || "API Client").trim().slice(0, 100);
  const scope = String(body?.scope || "read_write").trim();
  if (!name) return jsonResponse({ success: false, error: "A key name is required." }, 400);
  if (!new Set(["read", "read_write", "admin"]).has(scope)) {
    return jsonResponse({ success: false, error: "Invalid API key scope." }, 400);
  }

  const expiryDays = Number.parseInt(body?.expiryDays, 10);
  if (!Number.isNaN(expiryDays) && (expiryDays < 0 || expiryDays > 3650)) {
    return jsonResponse({ success: false, error: "Expiry must be between 0 and 3650 days." }, 400);
  }

  const token = `ff_live_${generateRandomHex(32)}`;
  const tokenHash = await hashApiToken(token);
  const keyId = `key_${generateRandomHex(8)}`;
  const keyPrefix = `${token.slice(0, 12)}...${token.slice(-4)}`;
  let expiresAt = null;
  if (Number.isFinite(expiryDays) && expiryDays > 0) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiryDays);
    expiresAt = expiry.toISOString();
  }

  try {
    await ensureKeysTable(db);
    await db.prepare(`
      INSERT INTO api_keys (key_id, name, key_prefix, key_token, scope, status, expires_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).bind(keyId, name, keyPrefix, tokenHash, scope, expiresAt).run();
    return jsonResponse({
      success: true,
      action: "created",
      key: {
        keyId, name, prefix: keyPrefix, token, scope, status: "active",
        expiresAt, createdAt: new Date().toISOString()
      }
    }, 201);
  } catch (error) {
    console.error("Unable to generate API key:", error);
    return jsonResponse({ success: false, error: "Failed to generate API key." }, 500);
  }
}

export async function onRequestDelete(context) {
  const denied = await authorize(context);
  if (denied) return denied;
  const db = context.env?.DB;
  if (!db) return jsonResponse({ success: false, error: "Database binding (DB) not configured." }, 503);
  const keyId = new URL(context.request.url).searchParams.get("keyId");
  if (!keyId) return jsonResponse({ success: false, error: 'Query parameter "keyId" is required.' }, 400);

  try {
    await ensureKeysTable(db);
    const result = await db.prepare(`
      UPDATE api_keys SET status = 'revoked'
      WHERE key_id = ? AND status <> 'revoked'
    `).bind(keyId).run();
    if (!(result?.meta?.changes > 0)) {
      return jsonResponse({ success: false, error: "API key was not found or is already revoked." }, 404);
    }
    return jsonResponse({ success: true, action: "revoked", keyId });
  } catch (error) {
    console.error("Unable to revoke API key:", error);
    return jsonResponse({ success: false, error: "Failed to revoke API key." }, 500);
  }
}
