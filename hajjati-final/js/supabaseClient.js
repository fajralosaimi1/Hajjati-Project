import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SESSION_KEY } from "./config.js";

const hasValidConfig =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("YOUR_") &&
  !SUPABASE_ANON_KEY.includes("YOUR_");

// ✅ FIX الجذري: لا storageKey — Supabase يحفظ الجلسة بمفتاحه الخاص
// كنا نكتب فوق مفتاح Supabase بصيغة خاطئة فيتعطل على الصفحة التالية
export const supabase = hasValidConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,   // Supabase يحفظ بنفسه في localStorage
        detectSessionInUrl: true
      }
    })
  : null;

// دوال احتياطية فقط — لا تكتب فوق مفتاح Supabase الداخلي
export function saveSession(session) {
  if (!session) return;
  try { localStorage.setItem(SESSION_KEY + "_backup", JSON.stringify(session)); } catch {}
}
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY + "_backup");
    // امسحي مفتاح Supabase الداخلي أيضاً عند الخروج
    Object.keys(localStorage)
      .filter(k => k.startsWith("sb-") || k.includes("supabase"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY + "_backup");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ✅ restoreSessionFromStorage: يعتمد على Supabase getSession فقط
export async function restoreSessionFromStorage() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session;
  } catch {}
  return null;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export function assertSupabase() {
  if (!supabase) throw new Error("يرجى إضافة بيانات Supabase الصحيحة في js/config.js");
  return supabase;
}