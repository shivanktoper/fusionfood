export async function onRequestGet({ env }) {
  if (!env?.DB) {
    return new Response(JSON.stringify({
      success: false, status: "degraded", database: "unbound"
    }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    return new Response(JSON.stringify({
      success: true, status: "ok", service: "fusion-food-pages",
      database: "connected", timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Pages health check failed:", error);
    return new Response(JSON.stringify({
      success: false, status: "degraded", database: "unavailable"
    }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}
