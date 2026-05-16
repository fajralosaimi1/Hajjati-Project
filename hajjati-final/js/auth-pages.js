import { initShell, toast } from "./app.js";
import {
  bootstrapAuth, getProfile, getSession,
  loginWithPassword, registerAccount, roleHome
} from "./auth.js";
import { getLang } from "./i18n.js";
import { ROUTES } from "./site.js";

const COUNTRIES = [
  ["SA","السعودية","Saudi Arabia"],["AE","الإمارات","UAE"],
  ["KW","الكويت","Kuwait"],["QA","قطر","Qatar"],
  ["BH","البحرين","Bahrain"],["OM","عُمان","Oman"],
  ["EG","مصر","Egypt"],["JO","الأردن","Jordan"]
];

function msg(ar, en) { return getLang() === "ar" ? ar : en; }

function populateCountries() {
  const sel = document.getElementById("countryCode");
  if (!sel) return;
  sel.innerHTML = COUNTRIES.map(([v,ar,en]) =>
    `<option value="${v}">${getLang()==="ar" ? ar : en}</option>`
  ).join("");
}

// ✅ FIX: فحص الجلسة بشكل آمن — أي خطأ يُتجاهل ويكمل الصفحة طبيعياً
async function redirectIfSessionExists() {
  try {
    await bootstrapAuth();
    const session = await getSession();
    if (!session) return false;

    // ✅ إذا فشل getProfile (403) لا نوقف الصفحة — نتجاهل الخطأ
    let profile = null;
    try { profile = await getProfile(); } catch { return false; }
    if (!profile) return false;

    window.location.href = roleHome(profile.role);
    return true;
  } catch {
    // أي خطأ غير متوقع — أكملي تحميل الصفحة طبيعياً
    return false;
  }
}

async function handleLoginSubmit(event, expectedRole) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await loginWithPassword({
      email: form.email.value.trim(),
      password: form.password.value,
      expectedRole
    });
    toast(msg(
      "تم التحقق. سيصلك رمز التحقق على بريدك الإلكتروني.",
      "Verified. Check your email for the OTP code."
    ), "success");
    window.location.href = ROUTES.otp;
  } catch (error) {
    toast(error.message || msg("تعذر تسجيل الدخول.", "Unable to sign in."), "error");
  } finally {
    submit.disabled = false;
  }
}

function collectRegisterPayload(form, role) {
  return {
    role,
    firstName: form.firstName.value.trim(),
    lastName: form.lastName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    password: form.password.value,
    countryCode: form.countryCode?.value || "SA",
    permitNumber: form.permitNumber?.value.trim() || "",
    nationalId: form.nationalId?.value.trim() || "",
    emergencyContactName: form.emergencyContactName?.value.trim() || "",
    emergencyContactPhone: form.emergencyContactPhone?.value.trim() || "",
    healthNotes: form.healthNotes?.value.trim() || "",
    companyName: form.companyName?.value.trim() || "",
    licenseNumber: form.licenseNumber?.value.trim() || "",
    commercialRegistration: form.commercialRegistration?.value.trim() || "",
    unifiedNumber: form.unifiedNumber?.value.trim() || "",
    city: form.city?.value.trim() || "",
    contactPerson: form.contactPerson?.value.trim() || ""
  };
}

async function handleRegisterSubmit(event, role) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  if (form.password.value !== form.confirmPassword.value) {
    toast(msg("كلمتا المرور غير متطابقتين.", "Passwords do not match."), "error");
    return;
  }
  submit.disabled = true;
  try {
    await registerAccount(collectRegisterPayload(form, role));
    toast(msg(
      "تم إنشاء الحساب. سيصلك رمز التحقق على بريدك.",
      "Account created. Check your email for the OTP."
    ), "success");
    window.location.href = ROUTES.otp;
  } catch (error) {
    toast(error.message || msg("تعذر إنشاء الحساب.", "Unable to create account."), "error");
  } finally {
    submit.disabled = false;
  }
}

export async function initLoginPage(role, scope) {
  initShell({ scope: "public", active: "login" });
  await redirectIfSessionExists();   // ✅ لا نوقف حتى لو فشل
  const form = document.getElementById("loginForm");
  if (form) form.addEventListener("submit", e => handleLoginSubmit(e, role));
  const back = document.getElementById("backToSelection");
  if (back) back.href = ROUTES.loginSelection;
  if (scope) document.body.dataset.scope = scope;
}

export async function initRegisterPage(role) {
  initShell({ scope: "public", active: "register" });
  await redirectIfSessionExists();   // ✅ لا نوقف حتى لو فشل
  populateCountries();
  const form = document.getElementById("registerForm");
  if (form) form.addEventListener("submit", e => handleRegisterSubmit(e, role));
  const back = document.getElementById("backToSelection");
  if (back) back.href = ROUTES.registerSelection;
}
