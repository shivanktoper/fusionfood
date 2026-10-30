// D1-backed per-IP rate limiting for provider-backed public endpoints.
// IP addresses are SHA-256 hashed before persistence.
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function checkServiceRateLimit(request, env, service, maxRequests = 12) {
  const db = env?.DB;
  if (!db) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({ success: false, error: "Rate-limit database binding is unavailable." }), {
        status: 503,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
      })
    };
  }

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      service TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      window_bucket INTEGER NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (service, ip_hash, window_bucket)
    )
  `).run();

  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256Hex(clientIp);
  const bucket = Math.floor(Date.now() / 600000);
  const row = await db.prepare(`
    INSERT INTO api_rate_limits (service, ip_hash, window_bucket, hits)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(service, ip_hash, window_bucket)
    DO UPDATE SET hits = hits + 1
    RETURNING hits
  `).bind(String(service), ipHash, bucket).first();

  if (Number(row?.hits || 0) > maxRequests) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({
        success: false,
        error: "Too many requests. Please wait a few minutes and try again."
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Retry-After": String(600 - (Math.floor(Date.now() / 1000) % 600))
        }
      })
    };
  }

  return { allowed: true };
}
