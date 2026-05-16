import { initShell, toast } from "./app.js";
import { formatRoleLabel, requireRole, signOut } from "./auth.js";
import {
  confirmMockPayment,
  loadEmergencyReports,
  loadNotifications,
  loadPilgrimApplications,
  localizedField
} from "./data-service.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

function statusBadge(status) {
  const labels = {
    pending: { cls: "pending", ar: "قيد المراجعة", en: "Pending Review" },
    rejected: { cls: "danger", ar: "مرفوض", en: "Rejected" },
    payment_pending: { cls: "pending", ar: "بانتظار الدفع", en: "Awaiting Payment" },
    paid: { cls: "success", ar: "مدفوع", en: "Paid" },
    completed: { cls: "success", ar: "مكتمل", en: "Completed" }
  };
  const current = labels[status] || labels.pending;
  return `<span class="badge ${current.cls}">${getLang() === "ar" ? current.ar : current.en}</span>`;
}

function renderApplications(applications) {
  const root = document.getElementById("applicationList");
  if (!root) return;
  if (!applications.length) {
    root.innerHTML = `<div class="empty-card">${msg("لا توجد طلبات حملات حتى الآن.", "No campaign applications yet.")}</div>`;
    return;
  }
  root.innerHTML = applications
    .map((item) => {
      const campaignName = localizedField(item.campaigns || item.campaign, "title_ar", "title_en");
      return `
        <div class="status-item">
          ${statusBadge(item.status)}
          <div>
            <strong>${campaignName}</strong>
            <div class="helper">${msg("الحالة الحالية", "Current status")}: ${
        getLang() === "ar" ? item.status : item.status
      }</div>
            <div class="helper">${msg("الدفع", "Payment")}: ${item.payment_status || "unpaid"}</div>
            ${
              item.status === "payment_pending"
                ? `<button class="btn btn-primary mt-1" data-pay-application="${item.id}" data-i18n-text="payment_action">${msg("تأكيد الدفع", "Confirm Payment")}</button>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function renderNotifications(items) {
  const root = document.getElementById("notificationList");
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<div class="empty-card">${msg("لا توجد تنبيهات جديدة.", "No recent alerts.")}</div>`;
    return;
  }
  root.innerHTML = items
    .map(
      (item) => `
        <div class="notification-card">
          <span class="badge ${item.priority === "high" ? "danger" : "success"}">${item.priority || "normal"}</span>
          <div>
            <strong>${localizedField(item, "title_ar", "title_en")}</strong>
            <div class="helper">${localizedField(item, "body_ar", "body_en")}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderQr(activeApplication) {
  const root = document.getElementById("qrStatusCard");
  if (!root) return;
  if (!activeApplication?.qr_token) {
    root.innerHTML = `
      <div class="empty-card">
        ${msg(
          "سيظهر الباركود هنا بعد قبول الطلب وتأكيد الدفع.",
          "The QR code will appear here after approval and payment confirmation."
        )}
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="surface-card tinted">
      <h3 data-i18n-text="qr_status">${msg("حالة الباركود", "QR Status")}</h3>
      <p>${msg("هذا الرمز مخصص لمرة واحدة فقط عند نقطة التجمع.", "This code is valid for one-time use at the gathering point only.")}</p>
      <div class="pill mt-2">${activeApplication.qr_token}</div>
      <div class="helper mt-2">${msg("عند التحقق الناجح سيتغير وضعه إلى مستخدم.", "After successful verification, it will be marked as used.")}</div>
    </div>
  `;
}

async function refreshPage(userId) {
  const applications = await loadPilgrimApplications(userId);
  const notifications = await loadNotifications(userId, "pilgrim");
  const reports = await loadEmergencyReports(userId);
  const approved = applications.filter((item) => ["payment_pending", "paid", "completed"].includes(item.status));
  const activeApplication =
    applications.find((item) => item.status === "paid" || item.status === "completed") ||
    applications.find((item) => item.status === "payment_pending");

  document.getElementById("kpiApplications").textContent = String(applications.length);
  document.getElementById("kpiApproved").textContent = String(approved.length);
  document.getElementById("kpiAlerts").textContent = String(notifications.length + reports.length);

  renderApplications(applications);
  renderNotifications(notifications);
  renderQr(activeApplication);

  document.querySelectorAll("[data-pay-application]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await confirmMockPayment(button.dataset.payApplication);
        toast(msg("تم تحديث حالة الدفع وتوليد الباركود.", "Payment confirmed and QR generated."), "success");
        await refreshPage(userId);
      } catch (error) {
        toast(error.message || msg("تعذر تحديث الدفع.", "Unable to update payment."), "error");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const auth = await requireRole("pilgrim");
    if (!auth) return;
    initShell({ scope: "pilgrim", active: "dashboard", onLogout: () => signOut() });

    const { profile, session } = auth;
    document.getElementById("profileInitial").textContent = (profile.full_name || "ح").slice(0, 1).toUpperCase();
    document.getElementById("profileName").textContent = profile.full_name || profile.email;
    document.getElementById("profileRole").textContent = formatRoleLabel(profile.role);
    document.getElementById("profileEmail").textContent = profile.email || session.user.email || "—";

    await refreshPage(session.user.id);
  } catch (error) {
    toast(error.message || msg("تعذر تحميل لوحة الحاج.", "Unable to load pilgrim dashboard."), "error");
  }
});
