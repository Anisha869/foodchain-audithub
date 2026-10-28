import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ override: process.env.NODE_ENV !== "production" });

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_KEY?.trim();
export const hasSupabaseConfig =
  Boolean(supabaseUrl && supabaseKey) &&
  !supabaseKey.toLowerCase().startsWith("your_");

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
}) : null;

export const checkSupabaseConnection = async () => {
  if (!supabase) {
    return { connected: false, tablesReady: false, error: "Supabase is not configured" };
  }

  try {
    const requiredTables = {
      users: "id,approval_status",
      customers: "id",
      sites: "id",
      audits: "id",
      checklists: "id",
      findings: "id",
    };
    const checksPromise = Promise.all(
      Object.entries(requiredTables).map(async ([table, columns]) => {
        const { error } = await supabase.from(table).select(columns).limit(1);
        return { table, error };
      })
    );
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Supabase check timeout")), 15000)
    );

    const results = await Promise.race([checksPromise, timeoutPromise]);
    const failedChecks = results.filter(({ error }) => error);
    if (failedChecks.length > 0) {
      const networkFailure = failedChecks.some(({ error }) =>
        error.message?.includes("fetch failed") ||
        error.message?.includes("ENOTFOUND") ||
        error.message?.includes("ECONN")
      );
      if (networkFailure) {
        return {
          connected: false,
          tablesReady: false,
          error: "Supabase could not be reached. Check network access and the configured project URL.",
        };
      }

      const missingTables = failedChecks
        .filter(({ error }) =>
          ["PGRST205", "PGRST204", "42P01"].includes(error.code) ||
          error.message?.includes("schema cache") ||
          error.message?.includes("does not exist")
        )
        .map(({ table }) => table);

      if (missingTables.length > 0) {
        return {
          connected: true,
          tablesReady: false,
          error: `Required Supabase schema elements are missing or unavailable: ${missingTables.join(", ")}`,
        };
      }

      return {
        connected: true,
        tablesReady: false,
        error: failedChecks.map(({ table, error }) => `${table}: ${error.message}`).join("; "),
      };
    }

    console.log("✅ Supabase PostgreSQL connected & tables verified!");
    return { connected: true, tablesReady: true };
  } catch (err) {
    console.error("Supabase connection check failed:", err.message);
    return { connected: false, tablesReady: false, error: err.message };
  }
};

export default supabase;
