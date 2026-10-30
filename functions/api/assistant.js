// Server-side culinary assistant proxy.
// Provider credentials stay in Cloudflare secrets and are never sent to browsers.
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

export async function onRequestGet({ request, env }) {
  if (!sameOrigin(request)) return json({ success: false, error: "Same-origin requests only." }, 403);
  return json({
    success: true,
    providers: {
      gemini: Boolean(env?.GEMINI_API_KEY),
      workersAI: Boolean(env?.AI || (env?.CLOUDFLARE_AI_TOKEN && env?.CLOUDFLARE_ACCOUNT_ID)),
      elevenLabs: Boolean(env?.ELEVENLABS_API_KEY)
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ success: false, error: "Same-origin requests only." }, 403);
  const limit = await checkServiceRateLimit(request, env, "assistant", 12);
  if (!limit.allowed) return limit.response;
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 24000) return json({ success: false, error: "Prompt is too large." }, 413);

  let body;
  try { body = await request.json(); }
  catch { return json({ success: false, error: "Invalid JSON request body." }, 400); }

  const prompt = String(body?.prompt || "").trim().slice(0, 1400);
  const systemPrompt = String(body?.systemPrompt || "").trim().slice(0, 16000);
  if (!prompt || !systemPrompt) return json({ success: false, error: "A prompt and system prompt are required." }, 400);

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ];

  try {
    if (env?.AI && typeof env.AI.run === "function") {
      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages, max_tokens: 500 });
      const text = result?.response || result?.result?.response || result?.text;
      if (text) return json({ success: true, text, provider: "cloudflare-workers-ai" });
    }

    if (env?.CLOUDFLARE_AI_TOKEN && env?.CLOUDFLARE_ACCOUNT_ID) {
      const fullPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`;
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.CLOUDFLARE_AI_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, max_tokens: 500 })
      });
      const result = await response.json().catch(() => ({}));
      const text = result?.result?.response || result?.result?.text;
      if (response.ok && text) return json({ success: true, text, provider: "cloudflare-workers-ai" });
    }

    if (env?.GEMINI_API_KEY) {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": String(env.GEMINI_API_KEY) },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.65, maxOutputTokens: 500 }
        })
      });
      const result = await response.json().catch(() => ({}));
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (response.ok && text) return json({ success: true, text, provider: "gemini" });
      return json({ success: false, error: result?.error?.message || "Gemini could not generate a response." }, response.status || 502);
    }

    return json({ success: false, error: "No AI provider is configured. Add GEMINI_API_KEY, CLOUDFLARE_AI_TOKEN plus CLOUDFLARE_ACCOUNT_ID, or an AI binding in Cloudflare." }, 503);
  } catch (error) {
    console.error("Assistant provider request failed:", error);
    return json({ success: false, error: "The AI assistant is temporarily unavailable." }, 502);
  }
}
