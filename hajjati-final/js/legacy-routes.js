import { getProfile, requireAuth, roleCampaigns, roleHome } from "./auth.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth("/pages/login.html");
  if (!session) return;
  const profile = await getProfile();
  const target = document.body.dataset.legacyTarget;
  document.getElementById("legacyText").textContent = msg(
    "جارٍ تحويلك إلى المسار المناسب...",
    "Redirecting you to the correct route..."
  );
  window.location.href = target === "campaigns" ? roleCampaigns(profile.role) : roleHome(profile.role);
});
