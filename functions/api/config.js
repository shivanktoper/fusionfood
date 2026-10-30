// Public, read-only website-wide configuration.
const DEFAULT_SITE_CONFIG = {
  appVersion: "v2",
  gameToggles: {
    buildDish: true,
    pronunciation: true,
    trivia: true,
    hotPotato: true,
    spinScience: true,
    indiaMap: false
  },
  v2Features: {
    fusionExplorerTab: true,
    tandoorSkewerGame: true,
    chefHatCameraFilter: true,
    faceVectorAntiDuplication: true,
    pdfPortfolioExport: true,
    aiFaceExplainerTour: true
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function ensureConfigTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS app_config (
      config_key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function onRequestGet(context) {
  const db = context.env?.DB;
  if (!db) return jsonResponse({ success: false, error: "Database binding (DB) not configured." }, 503);

  try {
    await ensureConfigTable(db);
    const row = await db.prepare("SELECT value_json, updated_at FROM app_config WHERE config_key = 'site_settings'").first();
    let config = DEFAULT_SITE_CONFIG;
    if (row?.value_json) {
      try {
        const saved = JSON.parse(row.value_json);
        config = {
          appVersion: ["v1", "v2", "v3"].includes(saved.appVersion) ? saved.appVersion : DEFAULT_SITE_CONFIG.appVersion,
          gameToggles: { ...DEFAULT_SITE_CONFIG.gameToggles, ...(saved.gameToggles || {}), indiaMap: false },
          v2Features: { ...DEFAULT_SITE_CONFIG.v2Features, ...(saved.v2Features || {}) }
        };
      } catch {
        config = DEFAULT_SITE_CONFIG;
      }
    }
    return jsonResponse({ success: true, config, updatedAt: row?.updated_at || null });
  } catch (error) {
    console.error("Could not load site configuration:", error);
    return jsonResponse({ success: false, error: "Could not load website configuration." }, 500);
  }
}
