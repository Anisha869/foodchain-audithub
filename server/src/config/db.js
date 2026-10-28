import { checkSupabaseConnection, hasSupabaseConfig } from "./supabase.js";
import { seedInitialData, setRemoteTablesReady } from "../services/dbService.js";

const connectDB = async () => {
  const demoMode = process.env.DATA_MODE === "demo";
  if (!hasSupabaseConfig) {
    if (!demoMode) {
      throw new Error(
        "Supabase is required. Configure SUPABASE_URL and SUPABASE_KEY, or explicitly set DATA_MODE=demo for local-only demo data."
      );
    }

    setRemoteTablesReady(false);
    await seedInitialData();
    console.warn("⚠️ Running with explicit DATA_MODE=demo; all data is temporary and local to this process.");
    return;
  }

  console.log("Connecting to the configured Supabase database...");
  const status = await checkSupabaseConnection();

  if (!status.connected || !status.tablesReady) {
    throw new Error(
      status.error || "Supabase is unavailable or the required schema is not ready. The API will not use demo storage."
    );
  }

  setRemoteTablesReady(true);
  console.log("✅ Supabase connected. No demo users or sample records were created.");
};

export default connectDB;
