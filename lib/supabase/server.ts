/**
 * Server-side Supabase client (service role).
 *
 * Returns `null` when Supabase env vars are absent — callers (the data layer in
 * `lib/repo.ts`) fall back to the in-memory store so the app still runs.
 * NEVER import this from a Client Component: the service role key is secret.
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseEnabled = Boolean(url && serviceKey);

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (cached) return cached;
  cached = createClient(url as string, serviceKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
