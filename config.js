// config.js
export const SUPABASE_URL = "https://jattwnvdrfwdfxzrwzgy.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_8vskfM3NxMq5lXHJmAlc0w_32jUvvD8";
// Cloudflare Turnstile Site Key (defaults to Cloudflare always-passes testing key if not configured)
export const TURNSTILE_SITE_KEY = "0x4AAAAAAEwQfi-EGp4YS8k7";

if (typeof window !== "undefined") {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.TURNSTILE_SITE_KEY = TURNSTILE_SITE_KEY;
}
