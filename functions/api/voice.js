// Server-side ElevenLabs text-to-speech proxy.
// The provider credential is a Cloudflare secret and never reaches the browser.
import { checkServiceRateLimit } from "./_rate-limit.js";
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try { return new URL(origin).origin === new URL(request.url).origin; }
    catch { return false; }
  }
  const site = request.headers.get("Sec-Fetch-Site");
  return site === "same-origin" || site === "none";
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ success: false, error: "Same-origin requests only." }, 403);
  if (!env?.ELEVENLABS_API_KEY) return json({ success: false, error: "ElevenLabs is not configured on this deployment." }, 503);
  const limit = await checkServiceRateLimit(request, env, "voice", 8);
  if (!limit.allowed) return limit.response;

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 6000) return json({ success: false, error: "Text is too long." }, 413);

  let body;
  try { body = await request.json(); }
  catch { return json({ success: false, error: "Invalid JSON request body." }, 400); }

  const text = String(body?.text || "").trim().slice(0, 1200);
  if (!text) return json({ success: false, error: "Text is required." }, 400);

  const voiceId = String(env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM").trim();
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": String(env.ELEVENLABS_API_KEY)
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.65, similarity_boost: 0.75 }
      })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("ElevenLabs response:", response.status, detail.slice(0, 300));
      return json({ success: false, error: "The neural voice provider rejected the request." }, 502);
    }
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("ElevenLabs request failed:", error);
    return json({ success: false, error: "The neural voice service is temporarily unavailable." }, 502);
  }
}
