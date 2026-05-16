import { initShell } from "./app.js";
import { getProfile, signOut } from "./auth.js";
import { getLang } from "./i18n.js";
import { FAQ_ITEMS } from "./site.js";
import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ اكتشف دور المستخدم وأظهر الهيدر المناسب
  let scope = "public";
  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        const profile = await getProfile();
        if (profile?.role === "owner") scope = "provider";
        else if (profile?.role === "pilgrim") scope = "pilgrim";
      }
    }
  } catch { /* مستخدم غير مسجل */ }

  initShell({
    scope,
    active: "faq",
    onLogout: scope !== "public" ? () => signOut() : undefined
  });

  const lang = getLang();

  // ✅ استخدام دوال تصميم جواهر لعرض الأسئلة
  if (window.renderFaqJawaher) {
    window.renderFaqJawaher("faqPilgrimList", FAQ_ITEMS.pilgrim, lang);
    window.renderFaqJawaher("faqProviderList", FAQ_ITEMS.provider, lang);
  }

  // ✅ تحديث العدادات
  if (window.updateFaqCounts) {
    window.updateFaqCounts(FAQ_ITEMS.pilgrim.length, FAQ_ITEMS.provider.length);
  }
});