import { initShell, toast } from "./app.js";
import { formatRoleLabel, requireRole, signOut } from "./auth.js";
import {
  loadApplicationsForOwner,
  loadNotifications,
  loadProviderCampaigns,
  localizedField
} from "./data-service.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

function renderCampaigns(campaigns) {
  const root = document.getElementById("latestCampaignList");
  if (!root) return;
  if (!campaigns.length) {
    root.innerHTML = `<div class="empty-card">${msg("لم تتم إضافة حملات بعد.", "No campaigns have been added yet.")}</div>`;
    return;
  }
  root.innerHTML = campaigns
    .slice(0, 3)
    .map(
      (campaign) => `
        <div class="list-card">
          <div>
            <strong>${localizedField(campaign, "title_ar", "title_en")}</strong>
            <div class="helper">${campaign.city} • ${campaign.seats_left ?? campaign.capacity}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderNotices(items) {
  const root = document.getElementById("providerNoticeList");
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<div class="empty-card">${msg("لا توجد تنبيهات داخلية حالياً.", "No internal notifications right now.")}</div>`;
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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const auth = await requireRole("owner");
    if (!auth) return;
    initShell({ scope: "provider", active: "dashboard", onLogout: () => signOut() });

    const { profile, session } = auth;
    document.getElementById("providerInitial").textContent = (profile.full_name || "م").slice(0, 1).toUpperCase();
    document.getElementById("providerName").textContent = profile.full_name || profile.email;
    document.getElementById("providerRole").textContent = formatRoleLabel(profile.role);
    document.getElementById("providerMeta").textContent = profile.email || session.user.email || "—";

    const [campaigns, applications, notifications] = await Promise.all([
      loadProviderCampaigns(session.user.id),
      loadApplicationsForOwner(session.user.id),
      loadNotifications(session.user.id, "owner")
    ]);

    document.getElementById("kpiCampaigns").textContent = String(campaigns.length);
    document.getElementById("kpiPending").textContent = String(
      applications.filter((item) => item.status === "pending").length
    );
    document.getElementById("kpiPaid").textContent = String(
      applications.filter((item) => item.payment_status === "paid").length
    );
    document.getElementById("kpiAlerts").textContent = String(notifications.length);

    renderCampaigns(campaigns);
    renderNotices(notifications);
  } catch (error) {
    toast(error.message || msg("تعذر تحميل لوحة مزود الخدمة.", "Unable to load the provider dashboard."), "error");
  }
});
