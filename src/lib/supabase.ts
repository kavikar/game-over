import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client, only when both public env vars exist. The service-role key must never
 * be read here: it is server-only and unused by the MVP.
 * STATUS: the data layer is not yet switched to Supabase; see IMPLEMENTATION_PLAN.md (M7).
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: true } });
}
