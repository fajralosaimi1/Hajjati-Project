import { closeModal, initShell, openModal, toast } from "./app.js";
import { requireRole, signOut } from "./auth.js";
import { createApplication, formatPrice, loadCampaigns, localizedField } from "./data-service.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

let currentCampaigns = [];
let currentUserId = "";

function renderCards(items) {
  const root = document.getElementById("campaignGrid");
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<div class="empty-card">${msg("لا توجد حملات مطابقة.", "No matching campaigns found.")}</div>`;
    return;
  }
  root.innerHTML = items
    .map(
      (item) => `
        <article class="campaign-card">
          <div class="campaign-head">
            <h3>${localizedField(item, "title_ar", "title_en")}</h3>
            <div class="campaign-meta">
              <span>${item.city}</span>
              <span>•</span>
              <span>${item.duration_days} ${msg("أيام", "days")}</span>
            </div>
          </div>
          <div class="campaign-body">
            <div class="campaign-specs">
              <div class="campaign-spec"><span data-i18n-text="price">${msg("السعر", "Price")}</span><strong>${formatPrice(item.price)}</strong></div>
              <div class="campaign-spec"><span data-i18n-text="seats_left">${msg("المقاعد المتبقية", "Seats Left")}</span><strong>${item.seats_left ?? item.available_spots ?? item.capacity}</strong></div>
              <div class="campaign-spec"><span data-i18n-text="meeting_point">${msg("نقطة التجمع", "Meeting Point")}</span><strong>${item.meeting_point || "—"}</strong></div>
            </div>
            <p class="helper">${localizedField(item, "description_ar", "description_en")}</p>
            <div class="role-actions mt-2">
              <button class="btn btn-primary" data-open-campaign="${item.id}" data-i18n-text="apply_now">${msg("تقديم الطلب", "Apply Now")}</button>
              <button class="btn btn-outline" data-preview-campaign="${item.id}" data-i18n-text="details">${msg("التفاصيل", "Details")}</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  root.querySelectorAll("[data-open-campaign], [data-preview-campaign]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.openCampaign || button.dataset.previewCampaign;
      const campaign = currentCampaigns.find((item) => item.id === id);
      if (campaign) showCampaignModal(campaign, Boolean(button.dataset.openCampaign));
    });
  });
}

function showCampaignModal(campaign, includeApply) {
  const modal = document.getElementById("campaignModal");
  const body = document.getElementById("campaignModalBody");
  body.innerHTML = `
    <div class="modal-head">
      <div>
        <div class="eyebrow">${campaign.city}</div>
        <h3 class="mt-1 mb-0">${localizedField(campaign, "title_ar", "title_en")}</h3>
      </div>
      <button class="close-btn" type="button" data-close-modal="campaignModal">×</button>
    </div>
    <div class="modal-body">
      <div class="split-panels">
        <div class="surface-card">
          <h3>${msg("التفاصيل", "Details")}</h3>
          <div class="campaign-specs">
            <div class="campaign-spec"><span>${msg("السعر", "Price")}</span><strong>${formatPrice(campaign.price)}</strong></div>
            <div class="campaign-spec"><span>${msg("نقطة التجمع", "Meeting Point")}</span><strong>${campaign.meeting_point || "—"}</strong></div>
            <div class="campaign-spec"><span>${msg("السكن", "Accommodation")}</span><strong>${localizedField(campaign, "accommodation_ar", "accommodation_en")}</strong></div>
          </div>
          <p class="helper">${localizedField(campaign, "description_ar", "description_en")}</p>
        </div>
        <div class="surface-card tinted">
          <h3>${msg("الشروط", "Terms")}</h3>
          <p>${localizedField(campaign, "terms_ar", "terms_en")}</p>
          ${
            includeApply
              ? `<button class="btn btn-primary btn-block btn-lg mt-2" id="confirmApplication">${msg("تقديم الطلب", "Apply Now")}</button>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
  openModal("campaignModal");
  window.HAJJATI_APP.bindCommon();
  if (includeApply) {
    document.getElementById("confirmApplication").addEventListener("click", async () => {
      try {
        await createApplication(currentUserId, campaign.id);
        toast(msg("تم إرسال الطلب لصاحب الحملة.", "Your application has been sent to the campaign owner."), "success");
        closeModal("campaignModal");
      } catch (error) {
        toast(error.message || msg("تعذر تقديم الطلب.", "Unable to submit the application."), "error");
      }
    });
  }
}

function bindSearch() {
  const search = document.getElementById("campaignSearch");
  if (!search) return;
  search.addEventListener("input", () => {
    const value = search.value.trim().toLowerCase();
    const filtered = currentCampaigns.filter((item) => {
      return [
        localizedField(item, "title_ar", "title_en"),
        item.city,
        localizedField(item, "description_ar", "description_en")
      ]
        .join(" ")
        .toLowerCase()
        .includes(value);
    });
    renderCards(filtered);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const auth = await requireRole("pilgrim");
    if (!auth) return;
    initShell({ scope: "pilgrim", active: "campaigns", onLogout: () => signOut() });
    currentUserId = auth.session.user.id;
    currentCampaigns = await loadCampaigns();
    document.getElementById("campaignCount").textContent = String(currentCampaigns.length);
    renderCards(currentCampaigns);
    bindSearch();
  } catch (error) {
    toast(error.message || msg("تعذر تحميل الحملات.", "Unable to load campaigns."), "error");
  }
});
