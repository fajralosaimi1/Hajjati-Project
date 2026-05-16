const ENV = typeof process !== "undefined" && process.env ? process.env : {};
const BROWSER_ENV = typeof window !== "undefined" ? (window.__HAJJATI_ENV__ || {}) : {};

export const SUPABASE_URL = BROWSER_ENV.SUPABASE_URL || ENV.SUPABASE_URL || "https://zukehvlzvihwnxyfdutg.supabase.co";
export const SUPABASE_ANON_KEY = BROWSER_ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1a2Vodmx6dmlod254eWZkdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDA5MjEsImV4cCI6MjA5MjQ3NjkyMX0.T6miypJ3rAojGfy2YtYye8sSbUw1VplEGf8i9V266N8";
export const LANG_KEY = "hajjati-lang";
export const SESSION_KEY = "hajjati-supabase-session";
export const PENDING_AUTH_KEY = "hajjati-pending-auth";
export const SMART_GUIDE_ENDPOINT = "/api/smart-guide";
export const DEFAULT_COUNTRY_CODE = "SA";
// ⚠️ تحذير أمني: المفاتيح المكشوفة أعلاه للاختبار فقط. في الإنتاج، استخدم Environment Variables في Vercel فقط.
export const AI_SETUP_NOTE =
  "Place OPENAI_API_KEY in your hosting environment variables or a secure serverless function. Never expose it in frontend JavaScript.";
export function normalizeRole(role) {
  return role === "owner" ? "provider" : role;
}

