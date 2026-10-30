// API-only Cloudflare Worker. The public website is hosted by Pages.
import * as profileHandler from "../functions/api/profile.js";
import * as syncHandler from "../functions/api/sync.js";
import * as leaderboardHandler from "../functions/api/leaderboard.js";
import * as submitScoreHandler from "../functions/api/submit-score.js";
import * as feedbackHandler from "../functions/api/feedback.js";
import * as adminKeysHandler from "../functions/api/admin/keys.js";
import * as adminSessionHandler from "../functions/api/admin/session.js";
import * as configHandler from "../functions/api/config.js";
import * as adminConfigHandler from "../functions/api/admin/config.js";
import * as assistantHandler from "../functions/api/assistant.js";
import * as voiceHandler from "../functions/api/voice.js";
import { getCorsHeaders } from "../functions/api/_middleware.js";

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders }
  });
}

function withHeaders(response, values) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(values)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const cors = getCorsHeaders(request, env);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (origin && !cors["Access-Control-Allow-Origin"]) {
        return new Response(null, { status: 403, headers: cors });
      }
      return new Response(null, { status: 204, headers: cors });
    }

    const pathname = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const context = {
      request, env, ctx, data: {},
      next: async () => new Response("Not Found", { status: 404 })
    };

    try {
      let response;
      if (pathname === "/api/profile") {
        if (request.method === "GET") response = await profileHandler.onRequestGet(context);
        else if (request.method === "POST") response = await profileHandler.onRequestPost(context);
        else response = jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/sync") {
        response = request.method === "POST"
          ? await syncHandler.onRequestPost(context)
          : jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/leaderboard") {
        if (request.method === "GET") response = await leaderboardHandler.onRequestGet(context);
        else if (request.method === "POST") response = await leaderboardHandler.onRequestPost(context);
        else response = jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/submit-score") {
        response = request.method === "POST"
          ? await submitScoreHandler.onRequestPost(context)
          : jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/feedback") {
        if (request.method === "GET") response = await feedbackHandler.onRequestGet(context);
        else if (request.method === "POST") response = await feedbackHandler.onRequestPost(context);
        else response = jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/assistant") {
        if (request.method === "GET") response = await assistantHandler.onRequestGet(context);
        else if (request.method === "POST") response = await assistantHandler.onRequestPost(context);
        else response = jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/voice") {
        response = request.method === "POST"
          ? await voiceHandler.onRequestPost(context)
          : jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/config") {
        response = request.method === "GET"
          ? await configHandler.onRequestGet(context)
          : jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/admin/config") {
        response = request.method === "POST"
          ? await adminConfigHandler.onRequestPost(context)
          : jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/admin/session") {
        if (request.method === "GET") response = await adminSessionHandler.onRequestGet(context);
        else if (request.method === "POST") response = await adminSessionHandler.onRequestPost(context);
        else if (request.method === "DELETE") response = await adminSessionHandler.onRequestDelete(context);
        else response = jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/admin/keys") {
        if (request.method === "GET") response = await adminKeysHandler.onRequestGet(context);
        else if (request.method === "POST") response = await adminKeysHandler.onRequestPost(context);
        else if (request.method === "DELETE") response = await adminKeysHandler.onRequestDelete(context);
        else response = jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
      } else if (pathname === "/api/health" || pathname === "/api/status") {
        response = jsonResponse({
          success: true, status: "ok", service: "fusion-food-worker",
          timestamp: new Date().toISOString(),
          database: env?.DB ? "bound" : "unbound", version: "1.1.0"
        });
      } else if (pathname.startsWith("/api/")) {
        response = jsonResponse({ success: false, error: "Endpoint not found." }, 404);
      } else {
        response = jsonResponse({
          success: false,
          error: "This Worker serves the Fusion Food API only. Open the Cloudflare Pages site for the web application."
        }, 404);
      }
      return withHeaders(response, cors);
    } catch (error) {
      console.error("Unhandled Worker request error:", error);
      return jsonResponse({ success: false, error: "Internal Server Error" }, 500, cors);
    }
  }
};
