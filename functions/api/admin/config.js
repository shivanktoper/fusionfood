// Protected website-wide configuration writer.
import { requireAdmin } from "./_auth.js";

const ALLOWED_GAME_TOGGLES = ["buildDish", "pronunciation", "trivia", "hotPotato", "spinScience"];
const ALLOWED_FEATURES = [
  "fusionExplorerTab", "tandoorSkewerGame", "chefHatCameraFilter",
  "faceVectorAntiDuplication", "pdfPortfolioExport", "aiFaceExplainerTour"
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function booleanSettings(source, allowed, defaults) {
  const result = {};
  for (const key of allowed) {
    result[key] = typeof source?.[key] === "boolean" ? source[key] : defaults[key];
  }
  return result;
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const db = context.env?.DB;
  if (!db) return jsonResponse({ success: false, error: "Database binding (DB) not configured." }, 503);

  const length = Number(context.request.headers.get("Content-Length") || 0);
  if (length > 12000) return jsonResponse({ success: false, error: "Configuration payload is too large." }, 413);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON request body." }, 400);
  }

  const input = body?.config;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonResponse({ success: false, error: "A configuration object is required." }, 400);
  }

  const config = {
    appVersion: ["v1", "v2", "v3"].includes(input.appVersion) ? input.appVersion : "v2",
    gameToggles: {
      ...booleanSettings(input.gameToggles, ALLOWED_GAME_TOGGLES, {
        buildDish: true, pronunciation: true, trivia: true, hotPotato: true, spinScience: true
      }),
      indiaMap: false
    },
    v2Features: booleanSettings(input.v2Features, ALLOWED_FEATURES, {
      fusionExplorerTab: true, tandoorSkewerGame: true, chefHatCameraFilter: true,
      faceVectorAntiDuplication: true, pdfPortfolioExport: true, aiFaceExplainerTour: true
    })
  };

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS app_config (
        config_key TEXT PRIMARY KEY NOT NULL,
        value_json TEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const value = JSON.stringify(config);
    await db.prepare(`
      INSERT INTO app_config (config_key, value_json, updated_at)
      VALUES ('site_settings', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(config_key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(value).run();

    return jsonResponse({ success: true, config, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Could not save site configuration:", error);
    return jsonResponse({ success: false, error: "Could not publish website settings." }, 500);
  }
}
