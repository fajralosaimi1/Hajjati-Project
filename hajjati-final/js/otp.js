import { initShell, toast } from "./app.js";
import { getPendingAuth, resendPendingOtp, verifyPendingOtp } from "./auth.js";
import { getLang } from "./i18n.js";
import { maskContact } from "./site.js";
import { ROUTES } from "./site.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

function renderPendingState() {
  const pending = getPendingAuth();
  const empty = document.getElementById("otpEmpty");
  const content = document.getElementById("otpContent");
  const contact = document.getElementById("otpContact");
  const role = document.getElementById("otpRole");
  if (!pending) {
    if (empty) empty.hidden = false;
    if (content) content.hidden = true;
    return null;
  }
  if (empty) empty.hidden = true;
  if (content) content.hidden = false;
  if (contact) {
    contact.textContent = maskContact(pending.email);
  }
  if (role) {
    role.textContent =
      pending.role === "owner"
        ? msg("مزود خدمة / صاحب حملة", "Service Provider / Campaign Owner")
        : msg("حاج", "Pilgrim");
  }
  return pending;
}

document.addEventListener("DOMContentLoaded", () => {
  initShell({ scope: "public", active: "login" });
  const pending = renderPendingState();
  const form = document.getElementById("otpForm");
  const resend = document.getElementById("resendOtp");
  const emptyLink = document.getElementById("emptyLoginLink");
  if (emptyLink) emptyLink.href = ROUTES.loginSelection;

  if (resend && pending) {
    resend.addEventListener("click", async () => {
      try {
        await resendPendingOtp();
        toast(msg("تمت إعادة إرسال الرمز.", "OTP resent."), "success");
      } catch (error) {
        toast(error.message || msg("تعذر إعادة الإرسال.", "Unable to resend the code."), "error");
      }
    });
  }

  if (form && pending) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const result = await verifyPendingOtp(form.otpToken.value.trim());
        toast(msg("تم التحقق بنجاح.", "Verification completed."), "success");
        window.location.href = result.next;
      } catch (error) {
        toast(error.message || msg("رمز التحقق غير صحيح.", "Invalid verification code."), "error");
      } finally {
        submit.disabled = false;
      }
    });
  }
});
