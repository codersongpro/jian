import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let browser: SupabaseClient | null = null;
export function configured() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    return (
      url.protocol === "https:" &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
    );
  } catch {
    return false;
  }
}
export function browserDb() {
  if (!configured()) return null;
  return (browser ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ));
}
export function publicDb(token?: string) {
  if (!configured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
    },
  );
}
