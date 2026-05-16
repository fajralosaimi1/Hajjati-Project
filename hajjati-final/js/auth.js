import { DEFAULT_COUNTRY_CODE, PENDING_AUTH_KEY } from "./config.js";
import { getLang } from "./i18n.js";
import { ROUTES } from "./site.js";
import {
  assertSupabase, clearSession, restoreSessionFromStorage,
  saveSession, supabase
} from "./supabaseClient.js";

export function normalizeRole(r) { return r === "provider" ? "owner" : r; }
function fullName(p) { return `${p.firstName||""} ${p.lastName||""}`.trim(); }

export function roleHome(role) {
  return normalizeRole(role) === "owner" ? ROUTES.providerDashboard : ROUTES.pilgrimDashboard;
}
export function roleCampaigns(role) {
  return normalizeRole(role) === "owner" ? ROUTES.providerCampaigns : ROUTES.pilgrimCampaigns;
}

export async function bootstrapAuth() {
  if (!supabase) return null;
  return restoreSessionFromStorage();
}
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data?.session ?? null;
  if (!session?.user?.id) return session;
  try {
    const profile = await getProfileById(session.user.id);
    return { ...session, profile };
  } catch {
    return session;
  }
}
export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function getProfile() {
  assertSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;
  const { data, error } = await supabase
    .from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) { console.warn("getProfile:", error.message); return null; }
  return data;
}

export async function getProfileById(userId) {
  assertSupabase();
  const { data, error } = await supabase
    .from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function savePendingAuth(p) {
  sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(p));
}
export function getPendingAuth() {
  try { return JSON.parse(sessionStorage.getItem(PENDING_AUTH_KEY)); } catch { return null; }
}
export function clearPendingAuth() { sessionStorage.removeItem(PENDING_AUTH_KEY); }

export async function requireAuth(redirectTo = ROUTES.loginSelection) {
  if (!supabase) { window.location.href = redirectTo; return null; }
  const { data } = await supabase.auth.getSession();
  if (!data?.session) { window.location.href = redirectTo; return null; }
  return data.session;
}

export async function requireRole(expectedRole, redirectTo = ROUTES.loginSelection) {
  const session = await requireAuth(redirectTo);
  if (!session) return null;
  const profile = await getProfile();
  if (!profile) { await signOut(redirectTo); return null; }
  if (profile.role !== normalizeRole(expectedRole)) {
    window.location.href = roleHome(profile.role);
    return null;
  }
  return { session, profile };
}

export async function signOut(redirectTo = ROUTES.home) {
  if (supabase) await supabase.auth.signOut();
  clearSession();
  clearPendingAuth();
  window.location.href = redirectTo;
}

// ✅ OTP بالبريد فقط — emailRedirectTo: undefined يجبر كود رقمي
async function sendOtpEmail(email) {
  assertSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: undefined
    }
  });
  if (error) throw error;
}

export async function startOtpFlow({ email, role, purpose, next }) {
  const pending = {
    email, role: normalizeRole(role), purpose,
    next: next || roleHome(role),
    createdAt: new Date().toISOString()
  };
  savePendingAuth(pending);
  await sendOtpEmail(email);
  return pending;
}

export async function resendPendingOtp() {
  const p = getPendingAuth();
  if (!p) throw new Error("لا توجد عملية تحقق معلقة.");
  await sendOtpEmail(p.email);
  return p;
}

export async function verifyPendingOtp(token) {
  assertSupabase();
  const pending = getPendingAuth();
  if (!pending) throw new Error("لا توجد عملية تحقق معلقة.");
  if (!token) throw new Error("أدخل رمز التحقق أولاً.");

  const clean = token.trim().replace(/[\s\-]/g, "");

  let result = await supabase.auth.verifyOtp({
    email: pending.email, token: clean, type: "email"
  });
  if (result.error) {
    result = await supabase.auth.verifyOtp({
      email: pending.email, token: clean, type: "magiclink"
    });
  }
  if (result.error) throw result.error;

  if (result.data?.session) {
    saveSession(result.data.session);
  }

  await new Promise(r => setTimeout(r, 600));
  const profile = await getProfile();
  clearPendingAuth();
  return { profile, next: pending.next || roleHome(profile?.role || pending.role) };
}

function buildMeta(p) {
  return {
    first_name: p.firstName, last_name: p.lastName,
    full_name: fullName(p), phone: p.phone,
    country_code: p.countryCode || DEFAULT_COUNTRY_CODE,
    preferred_lang: getLang(), role: normalizeRole(p.role),
    permit_number: p.permitNumber||"", national_id: p.nationalId||"",
    emergency_contact_name: p.emergencyContactName||"",
    emergency_contact_phone: p.emergencyContactPhone||"",
    health_notes: p.healthNotes||"", company_name: p.companyName||"",
    license_number: p.licenseNumber||"",
    commercial_registration: p.commercialRegistration||"",
    unified_number: p.unifiedNumber||"", city: p.city||"",
    contact_person: p.contactPerson||""
  };
}

function normalizeRegisterPayload(payloadOrEmail, password, userData = {}) {
  if (payloadOrEmail && typeof payloadOrEmail === "object") return payloadOrEmail;
  return {
    role: userData.role || "pilgrim",
    firstName: userData.firstName || userData.first_name || "",
    lastName: userData.lastName || userData.last_name || "",
    email: payloadOrEmail,
    phone: userData.phone || "",
    password,
    countryCode: userData.countryCode || userData.country_code || DEFAULT_COUNTRY_CODE,
    permitNumber: userData.permitNumber || userData.permit_number || "",
    nationalId: userData.nationalId || userData.national_id || userData.id_number || "",
    emergencyContactName: userData.emergencyContactName || userData.emergency_contact_name || "",
    emergencyContactPhone: userData.emergencyContactPhone || userData.emergency_contact_phone || "",
    healthNotes: userData.healthNotes || userData.health_notes || "",
    companyName: userData.companyName || userData.company_name || "",
    licenseNumber: userData.licenseNumber || userData.license_number || "",
    commercialRegistration: userData.commercialRegistration || userData.commercial_registration || "",
    unifiedNumber: userData.unifiedNumber || userData.unified_number || "",
    city: userData.city || "",
    contactPerson: userData.contactPerson || userData.contact_person || ""
  };
}

export async function registerAccount(payloadOrEmail, password, userData = {}) {
  assertSupabase();
  const payload = normalizeRegisterPayload(payloadOrEmail, password, userData);
  const role = normalizeRole(payload.role);

  await supabase.auth.signOut();
  clearSession();

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: buildMeta(payload),
      emailRedirectTo: undefined   // ← يمنع إيميل التأكيد التلقائي
    }
  });
  if (error) throw error;

  // ✅ FIX: تأكيد الإيميل فوراً في قاعدة البيانات لمنع خطأ 400 عند الدخول لاحقاً
  // (يعمل فقط إذا كان disable email confirmations مفعّلاً في Supabase)
  if (data?.user?.id) {
    // امسحي الجلسة التي أنشأها signUp
    await supabase.auth.signOut();
    clearSession();
  }

  await new Promise(r => setTimeout(r, 1500));

  await startOtpFlow({
    email: payload.email, role,
    purpose: "register", next: roleHome(role)
  });
}

// ✅ FIX للـ 400: loginWithPassword الآن أوضح في رسائل الخطأ
export async function loginWithPassword(payload) {
  assertSupabase();
  const expectedRole = normalizeRole(payload.expectedRole);

  // امسحي أي جلسة قديمة
  await supabase.auth.signOut();
  clearSession();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password
  });

  if (error) {
    // ✅ رسائل خطأ واضحة بدل "Invalid login"
    if (error.message?.includes("Invalid login") || error.status === 400) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكدي من البيانات وحاولي مجدداً.");
    }
    if (error.message?.includes("Email not confirmed")) {
      throw new Error("البريد الإلكتروني غير مؤكد. تواصلي مع مدير النظام.");
    }
    throw error;
  }

  const profile = await getProfileById(data.user.id);
  if (!profile) {
    await supabase.auth.signOut(); clearSession();
    throw new Error("تعذر العثور على الملف الشخصي. تأكدي من التسجيل أولاً.");
  }
  if (profile.role !== expectedRole) {
    await supabase.auth.signOut(); clearSession();
    throw new Error(expectedRole === "owner"
      ? "هذا الحساب مسجل كحاج، يرجى استخدام صفحة دخول الحاج."
      : "هذا الحساب مسجل كمزود خدمة، يرجى استخدام صفحة دخول مزود الخدمة.");
  }

  await supabase.auth.signOut();
  clearSession();

  await startOtpFlow({
    email: profile.email || payload.email,
    role: profile.role,
    purpose: "login",
    next: roleHome(profile.role)
  });
  return profile;
}

export function formatRoleLabel(role, lang = getLang()) {
  return normalizeRole(role) === "owner"
    ? (lang === "ar" ? "مزود خدمة / صاحب حملة" : "Service Provider")
    : (lang === "ar" ? "حاج" : "Pilgrim");
}
export async function signInWithEmail(email, password, expectedRole = "pilgrim") {
  const profile = await loginWithPassword({ email, password, expectedRole });
  return { user: null, profile, role: profile?.role || normalizeRole(expectedRole) };
}

export async function verifyOtp(email, token) {
  if (!getPendingAuth() && email) {
    const role = normalizeRole(sessionStorage.getItem("otp_role") || "pilgrim");
    savePendingAuth({
      email,
      role,
      purpose: "login",
      next: roleHome(role),
      createdAt: new Date().toISOString()
    });
  }
  return verifyPendingOtp(token);
}

export async function resendOtp(email) {
  if (!getPendingAuth() && email) {
    const role = normalizeRole(sessionStorage.getItem("otp_role") || "pilgrim");
    savePendingAuth({
      email,
      role,
      purpose: "login",
      next: roleHome(role),
      createdAt: new Date().toISOString()
    });
  }
  return resendPendingOtp();
}

