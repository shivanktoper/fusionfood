const COOKIE_NAME = "__Host-fusionfood-admin";
const SESSION_TTL_SECONDS = 2 * 60 * 60;
const encoder = new TextEncoder();

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(left, right) {
  const a = encoder.encode(String(left ?? ""));
  const b = encoder.encode(String(right ?? ""));
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    mismatch |= (a[i] || 0) ^ (b[i] || 0);
  }
  return mismatch === 0;
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const item of header.split(";")) {
    const index = item.indexOf("=");
    if (index > 0 && item.slice(0, index).trim() === name) return item.slice(index + 1).trim();
  }
  return "";
}

function sameOriginRequest(request) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try { return new URL(origin).origin === new URL(request.url).origin; }
    catch { return false; }
  }
  const site = request.headers.get("Sec-Fetch-Site");
  return site === "same-origin" || site === "none";
}

function configurationError() {
  return jsonResponse({
    success: false,
    error: "Admin authentication is not configured. Set ADMIN_PIN and ADMIN_SESSION_SECRET as Cloudflare secrets."
  }, 503);
}

function unauthorized() {
  return jsonResponse({
    success: false,
    error: "Admin session is missing or expired. Unlock the Admin panel again."
  }, 401);
}

export async function createAdminSession(context, pin) {
  if (!sameOriginRequest(context.request)) {
    return jsonResponse({ success: false, error: "Admin sign-in requests must be same-origin." }, 403);
  }
  const env = context.env || {};
  if (!env.ADMIN_PIN || !env.ADMIN_SESSION_SECRET || String(env.ADMIN_SESSION_SECRET).length < 32) {
    return configurationError();
  }
  if (!safeEqual(pin, env.ADMIN_PIN)) {
    return jsonResponse({ success: false, error: "Incorrect Admin PIN." }, 401);
  }

  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${expiry}.${nonce}`;
  const signature = await sign(payload, String(env.ADMIN_SESSION_SECRET));
  const cookie = `${payload}.${signature}`;

  return jsonResponse({
    success: true,
    expiresAt: new Date(expiry * 1000).toISOString()
  }, 200, {
    "Set-Cookie": `${COOKIE_NAME}=${cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`
  });
}

export async function requireAdmin(context) {
  if (!sameOriginRequest(context.request)) {
    return { ok: false, response: jsonResponse({ success: false, error: "Admin requests must be same-origin." }, 403) };
  }
  const env = context.env || {};
  if (!env.ADMIN_PIN || !env.ADMIN_SESSION_SECRET || String(env.ADMIN_SESSION_SECRET).length < 32) {
    return { ok: false, response: configurationError() };
  }

  const parts = getCookie(context.request, COOKIE_NAME).split(".");
  if (parts.length !== 3) return { ok: false, response: unauthorized() };

  const [expiryText, nonce, signature] = parts;
  const expiry = Number(expiryText);
  if (!Number.isSafeInteger(expiry) ||
      expiry <= Math.floor(Date.now() / 1000) ||
      !/^[0-9a-f]{32}$/.test(nonce) || !signature) {
    return { ok: false, response: unauthorized() };
  }

  const expected = await sign(`${expiry}.${nonce}`, String(env.ADMIN_SESSION_SECRET));
  if (!safeEqual(signature, expected)) return { ok: false, response: unauthorized() };
  return { ok: true };
}

export function clearAdminSession() {
  return jsonResponse({ success: true }, 200, {
    "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  });
}
