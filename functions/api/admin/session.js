import { createAdminSession, requireAdmin, clearAdminSession } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  return new Response(JSON.stringify({ success: true, authenticated: true }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestPost(context) {
  const length = Number(context.request.headers.get("Content-Length") || 0);
  if (length > 2048) {
    return new Response(JSON.stringify({ success: false, error: "Request body is too large." }), {
      status: 413, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON request body." }), {
      status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (pin.length < 4 || pin.length > 128) {
    return new Response(JSON.stringify({ success: false, error: "Enter a valid Admin PIN." }), {
      status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
  return createAdminSession(context, pin);
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  return clearAdminSession();
}
