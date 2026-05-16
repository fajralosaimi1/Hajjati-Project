import { initShell, toast } from "./app.js";
import { requireRole, signOut } from "./auth.js";
import {
  createCampaign,
  loadApplicationsForOwner,
  loadProviderCampaigns,
  localizedField,
  sendNotification,
  updateApplicationStatus
} from "./data-service.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

let ownerId = "";

function renderCampaignList(campaigns) {
  const root = document.getElementById("providerCampaignList");
  const select = document.getElementById("notificationCampaign");
  if (!root || !select) return;
  if (!campaigns.length) {
    root.innerHTML = `<div class="empty-card">${msg("ابدأ بإضافة حملة جديدة لتظهر هنا.", "Add your first campaign to see it here.")}</div>`;
    select.innerHTML = `<option value="">${msg("لا توجد حملات", "No campaigns")}</option>`;
    return;
  }
  root.innerHTML = campaigns
    .map(
      (campaign) => `
        <div class="surface-card">
          <h3>${localizedField(campaign, "title_ar", "title_en")}</h3>
          <p>${localizedField(campaign, "description_ar", "description_en")}</p>
          <div class="campaign-specs mt-2">
            <div class="campaign-spec"><span>${msg("المدينة", "City")}</span><strong>${campaign.city}</strong></div>
            <div class="campaign-spec"><span>${msg("المقاعد", "Seats")}</span><strong>${campaign.seats_left ?? campaign.capacity}</strong></div>
          </div>
        </div>
      `
    )
    .join("");

  select.innerHTML =
    `<option value="">${msg("اختيار حملة", "Choose campaign")}</option>` +
    campaigns
      .map(
        (campaign) =>
          `<option value="${campaign.id}">${localizedField(campaign, "title_ar", "title_en")}</option>`
      )
      .join("");
}

function statusLabel(item) {
  const labels = {
    pending: msg("قيد المراجعة", "Pending"),
    payment_pending: msg("بانتظار الدفع", "Awaiting Payment"),
    rejected: msg("مرفوض", "Rejected"),
    paid: msg("مدفوع", "Paid"),
    completed: msg("مكتمل", "Completed")
  };
  return labels[item.status] || item.status;
}

function renderApplications(items) {
  const body = document.getElementById("applicationTableBody");
  if (!body) return;
  if (!items.length) {
    body.innerHTML = `<tr><td colspan="5" class="center">${msg("لا توجد طلبات حالياً.", "No applications yet.")}</td></tr>`;
    return;
  }

  body.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.pilgrim?.full_name || "—"}</td>
          <td>${item.campaign ? localizedField(item.campaign, "title_ar", "title_en") : "—"}</td>
          <td>${statusLabel(item)}</td>
          <td>${item.pilgrim?.phone || item.pilgrim?.email || "—"}</td>
          <td>
            <div class="actions-inline">
              <button class="btn btn-primary" data-action="payment_pending" data-id="${item.id}" data-status="${item.payment_status}">${msg("طلب الدفع", "Request Payment")}</button>
              <button class="btn btn-outline" data-action="rejected" data-id="${item.id}">${msg("رفض", "Reject")}</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  body.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const patch =
          button.dataset.action === "payment_pending"
            ? { status: "payment_pending", payment_status: "pending" }
            : { status: "rejected", payment_status: "unpaid" };
        await updateApplicationStatus(button.dataset.id, patch);
        toast(
          button.dataset.action === "payment_pending"
            ? msg("تم نقل الطلب إلى مرحلة الدفع.", "Application moved to payment stage.")
            : msg("تم رفض الطلب.", "Application rejected."),
          "success"
        );
        await refresh();
      } catch (error) {
        toast(error.message || msg("تعذر تحديث الطلب.", "Unable to update application."), "error");
      }
    });
  });
}

async function refresh() {
  const [campaigns, applications] = await Promise.all([
    loadProviderCampaigns(ownerId),
    loadApplicationsForOwner(ownerId)
  ]);
  renderCampaignList(campaigns);
  renderApplications(applications);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const auth = await requireRole("owner");
    if (!auth) return;
    ownerId = auth.session.user.id;
    initShell({ scope: "provider", active: "campaigns", onLogout: () => signOut() });
    await refresh();

    const campaignForm = document.getElementById("campaignForm");
    if (campaignForm) {
      campaignForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await createCampaign(
            {
              titleAr: campaignForm.titleAr.value.trim(),
              titleEn: campaignForm.titleEn.value.trim(),
              city: campaignForm.city.value.trim(),
              meetingPoint: campaignForm.meetingPoint.value.trim(),
              accommodationAr: campaignForm.accommodationAr.value.trim(),
              accommodationEn: campaignForm.accommodationEn.value.trim(),
              price: campaignForm.price.value,
              capacity: campaignForm.capacity.value,
              durationDays: campaignForm.durationDays.value,
              descriptionAr: campaignForm.descriptionAr.value.trim(),
              descriptionEn: campaignForm.descriptionEn.value.trim(),
              termsAr: campaignForm.termsAr.value.trim(),
              termsEn: campaignForm.termsEn.value.trim()
            },
            ownerId
          );
          campaignForm.reset();
          toast(msg("تمت إضافة الحملة بنجاح.", "Campaign added successfully."), "success");
          await refresh();
        } catch (error) {
          toast(error.message || msg("تعذر إضافة الحملة.", "Unable to create campaign."), "error");
        }
      });
    }

    const notificationForm = document.getElementById("notificationForm");
    if (notificationForm) {
      notificationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await sendNotification(
            {
              campaignId: notificationForm.campaignId.value || null,
              titleAr: notificationForm.titleAr.value.trim(),
              titleEn: notificationForm.titleEn.value.trim(),
              bodyAr: notificationForm.bodyAr.value.trim(),
              bodyEn: notificationForm.bodyEn.value.trim(),
              audience: "campaign_members"
            },
            ownerId
          );
          notificationForm.reset();
          toast(msg("تم إرسال التنبيه.", "Alert sent successfully."), "success");
        } catch (error) {
          toast(error.message || msg("تعذر إرسال التنبيه.", "Unable to send the alert."), "error");
        }
      });
    }
  } catch (error) {
    toast(error.message || msg("تعذر تحميل إدارة الحملات.", "Unable to load campaign management."), "error");
  }
});
