import { checkSupabaseConnection, hasSupabaseConfig } from "../config/supabase.js";

export const getHealth = async (req, res) => {
  let database = hasSupabaseConfig ? "unavailable" : "unconfigured";
  let databaseReady = false;
  try {
    const status = await checkSupabaseConnection();
    database = status.tablesReady
      ? "connected"
      : status.connected
        ? "schema_missing"
        : hasSupabaseConfig
          ? "unavailable"
          : "unconfigured";
    databaseReady = status.tablesReady;
  } catch (error) {
    console.error("Health check database error:", error.message);
  }

  const demoMode = !hasSupabaseConfig && process.env.DATA_MODE === "demo";
  res.status(200).json({
    status: databaseReady || demoMode ? "ok" : "degraded",
    service: "FoodChain AuditHub API",
    timestamp: new Date().toISOString(),
    database: demoMode ? "demo" : database,
    aiEngine: "VERA Dense Extractive RAG (Offline)",
    environment: process.env.NODE_ENV || "development",
  });
};
