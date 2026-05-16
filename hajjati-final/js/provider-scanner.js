import { initShell, toast } from "./app.js";
import { requireRole, signOut } from "./auth.js";
import { validateQrForOwner } from "./data-service.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

function renderResult(result) {
  const root = document.getElementById("scannerResult");
  if (!root) return;

  if (result.status === "invalid") {
    root.innerHTML = `<div class="empty-card text-danger">${msg("الرمز غير صالح أو لا يتبع لهذه الحملة.", "The code is invalid or does not belong to your campaign.")}</div>`;
    return;
  }
  if (result.status === "used") {
    root.innerHTML = `<div class="surface-card"><h3>${msg("تم استخدام الرمز سابقاً", "Code already used")}</h3><p>${msg("لا يمكن إعادة استخدام هذا الباركود.", "This QR code cannot be reused.")}</p></div>`;
    return;
  }
  if (result.status === "unpaid") {
    root.innerHTML = `<div class="surface-card"><h3>${msg("الحجز غير مكتمل الدفع", "Payment not completed")}</h3><p>${msg("لا يمكن اعتماد الوصول قبل تأكيد الدفع.", "Arrival cannot be approved before payment is confirmed.")}</p></div>`;
    return;
  }

  root.innerHTML = `
    <div class="surface-card tinted">
      <h3>${msg("تم اعتماد الدخول", "Check-in verified")}</h3>
      <p>${msg("تم تسجيل وصول الحاج وربط العملية بسجل الحملة.", "The pilgrim check-in has been recorded and linked to the campaign log.")}</p>
      <div class="campaign-specs mt-2">
        <div class="campaign-spec"><span>${msg("اسم الحاج", "Pilgrim Name")}</span><strong>${result.pilgrim?.full_name || "—"}</strong></div>
        <div class="campaign-spec"><span>${msg("الحملة", "Campaign")}</span><strong>${result.campaign?.title_ar || result.campaign?.title_en || "—"}</strong></div>
        <div class="campaign-spec"><span>${msg("وسيلة التواصل", "Contact")}</span><strong>${result.pilgrim?.phone || result.pilgrim?.email || "—"}</strong></div>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const auth = await requireRole("owner");
    if (!auth) return;
    initShell({ scope: "provider", active: "scanner", onLogout: () => signOut() });

    const form = document.getElementById("scannerForm");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const result = await validateQrForOwner(auth.session.user.id, form.qrToken.value.trim());
          renderResult(result);
          toast(
            result.status === "valid"
              ? msg("تم التحقق من الرمز بنجاح.", "QR verified successfully.")
              : msg("تمت مراجعة الرمز.", "The QR code has been checked."),
            result.status === "valid" ? "success" : "info"
          );
        } catch (error) {
          toast(error.message || msg("تعذر التحقق من الرمز.", "Unable to verify the QR code."), "error");
        }
      });
    }
  } catch (error) {
    toast(error.message || msg("تعذر تحميل صفحة الماسح.", "Unable to load the scanner page."), "error");
  }
});
