// Cloudflare Pages Functions middleware for /api/*.
// CORS is an origin allowlist, not an authentication mechanism.
function isAllowedOrigin(origin, env = {}) {
  if (!origin) return false;
  if (origin === "null") return env.ENVIRONMENT !== "production";

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (parsed.origin !== origin) return false;

  const configured = [
    ...String(env.CORS_ORIGIN || "").split(","),
    ...String(env.CORS_ALLOWED_ORIGINS || "").split(",")
  ].map(value => value.trim()).filter(Boolean);

  if (configured.includes(parsed.origin)) return true;

  // Only allow this Pages project's preview/production hostnames.
  if (
    parsed.protocol === "https:" &&
    (parsed.hostname === "fusionfood-383.pages.dev" ||
      parsed.hostname.endsWith(".fusionfood-383.pages.dev"))
  ) {
    return true;
  }

  if (
    env.ENVIRONMENT !== "production" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
  ) {
    return true;
  }

  return false;
}

export function getCorsHeaders(request, env = {}) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Cache-Control",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
    "Cache-Control": "no-store"
  };

  const origin = request.headers.get("Origin");
  const requestedHeaders = request.headers.get("Access-Control-Request-Headers") || "";
  const requestedHeaderNames = requestedHeaders.toLowerCase().split(",").map(value => value.trim());
  const hasBearerAuthorization = /^Bearer\s+ff_live_[A-Za-z0-9_-]+$/i.test(request.headers.get("Authorization") || "");
  const bearerPreflight = requestedHeaderNames.includes("authorization");
  if (origin && (isAllowedOrigin(origin, env) || hasBearerAuthorization || bearerPreflight)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export async function onRequest(context) {
  const { request, env } = context;
  const cors = getCorsHeaders(request, env);
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    if (origin && !cors["Access-Control-Allow-Origin"]) {
      return new Response(null, { status: 403, headers: cors });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const response = await context.next();
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);
    const vary = new Set(String(headers.get("Vary") || "").split(",").map(v => v.trim()).filter(Boolean));
    vary.add("Origin");
    headers.set("Vary", Array.from(vary).join(", "));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.error("Unhandled Pages Function error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal Server Error"
    }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
