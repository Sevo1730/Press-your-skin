import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Lazy so the build can prerender these pages without env vars present — the
 * client is only ever constructed in the browser, inside useRoom's effect.
 */
export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Loud: a silent dead board mid-stream is much worse than a console error.
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.example");
  }
  client = createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 20 } } });
  return client;
}

/** One broadcast channel per stream. Override if you ever run two games at once. */
export const ROOM = process.env.NEXT_PUBLIC_ROOM ?? "pyl-room";
