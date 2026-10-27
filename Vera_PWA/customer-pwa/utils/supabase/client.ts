import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://apggastwmnrcmzargawr.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Zsbq2dLcAPZQQ_a0M25ZwQ_V4Vfqccj";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
