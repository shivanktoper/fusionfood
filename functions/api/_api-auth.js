// Shared bearer-token authorization for public data APIs.
// API tokens are SHA-256 hashed before storage; plaintext tokens are returned only once.
export async function hashApiToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(token || "")));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(data, status = 401) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function sameOriginRequest(request) {
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin) {
    try {
      return new URL(requestOrigin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get("Sec-Fetch-Site") === "same-origin";
}

export async function authorizeApiRequest(context, requiredScope = "read") {
  const { request, env } = context;
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(ff_live_[A-Za-z0-9_-]+)$/i)?.[1] || "";

  if (!bearer) {
    if (sameOriginRequest(request)) return { ok: true, scope: "same-origin" };
    return {
      ok: false,
      response: jsonResponse({ success: false, error: "A valid API key is required for cross-origin access." }, 401)
    };
  }

  const db = env?.DB;
  if (!db) {
    return { ok: false, response: jsonResponse({ success: false, error: "Database binding (DB) not configured." }, 503) };
  }

  try {
    const digest = await hashApiToken(bearer);
    let key = await db.prepare(`
      SELECT key_id, scope, status, expires_at
      FROM api_keys
      WHERE key_token = ?
      LIMIT 1
    `).bind(digest).first();

    // One-time compatibility path for tokens created before hashes were introduced.
    if (!key) {
      const legacy = await db.prepare(`
        SELECT key_id, scope, status, expires_at
        FROM api_keys
        WHERE key_token = ?
        LIMIT 1
      `).bind(bearer).first();
      if (legacy) {
        await db.prepare("UPDATE api_keys SET key_token = ? WHERE key_id = ?").bind(digest, legacy.key_id).run();
        key = legacy;
      }
    }

    if (!key || key.status !== "active") {
      return { ok: false, response: jsonResponse({ success: false, error: "API key is invalid or revoked." }, 401) };
    }

    if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
      return { ok: false, response: jsonResponse({ success: false, error: "API key has expired." }, 401) };
    }

    const scope = String(key.scope || "read");
    const canRead = ["read", "read_write", "admin"].includes(scope);
    const canWrite = ["read_write", "admin"].includes(scope);
    if ((requiredScope === "write" && !canWrite) || (requiredScope === "read" && !canRead)) {
      return { ok: false, response: jsonResponse({ success: false, error: "This API key does not have the required permission." }, 403) };
    }

    return { ok: true, scope, keyId: key.key_id };
  } catch (error) {
    console.error("API key authentication failed:", error);
    return { ok: false, response: jsonResponse({ success: false, error: "Could not verify API key." }, 503) };
  }
}
