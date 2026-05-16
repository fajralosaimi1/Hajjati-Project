import { initShell, toast } from "./app.js";
import { getProfile, requireAuth, signOut } from "./auth.js";
import { createEmergencyReport, loadEmergencyReports } from "./data-service.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

function renderReports(reports) {
  const root = document.getElementById("reportList");
  if (!root) return;
  if (!reports.length) {
    root.innerHTML = `<div class="empty-card">${msg("لا توجد بلاغات سابقة.", "No previous reports.")}</div>`;
    return;
  }
  root.innerHTML = reports
    .map(
      (item) => `
        <div class="timeline-item">
          <span class="badge ${item.status === "open" ? "pending" : "success"}">${item.status}</span>
          <div>
            <strong>${item.report_type || "general"}</strong>
            <div class="helper">${item.message}</div>
            <div class="helper">${item.location_text || "—"}</div>
          </div>
        </div>
      `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const session = await requireAuth();
    if (!session) return;
    const profile = await getProfile();
    initShell({
      scope: profile?.role === "owner" ? "provider" : "pilgrim",
      active: "emergency",
      onLogout: () => signOut()
    });

    const refresh = async () => {
      const reports = await loadEmergencyReports(session.user.id);
      renderReports(reports);
    };

    const form = document.getElementById("emergencyForm");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.message.value.trim()) {
          toast(msg("اكتب وصف الحالة أولاً.", "Please enter a case description first."), "error");
          return;
        }
        try {
          await createEmergencyReport(
            {
              reportType: form.reportType.value,
              locationText: form.locationText.value.trim(),
              message: form.message.value.trim()
            },
            session.user.id
          );
          form.reset();
          toast(msg("تم إرسال البلاغ بنجاح.", "The report was submitted successfully."), "success");
          await refresh();
        } catch (error) {
          toast(error.message || msg("تعذر إرسال البلاغ.", "Unable to submit the report."), "error");
        }
      });
    }

    document.querySelectorAll("[data-report-fill]").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById("reportType").value = button.dataset.reportFill;
      });
    });

    await refresh();
  } catch (error) {
    toast(error.message || msg("تعذر تحميل صفحة الطوارئ.", "Unable to load the emergency page."), "error");
  }
});
