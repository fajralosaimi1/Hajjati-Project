import { initShell, toast } from "./app.js";
import { requireRole, signOut } from "./auth.js";
import { SMART_GUIDE_ENDPOINT } from "./config.js";
import { logSmartGuideMessage } from "./data-service.js";
import { getLang } from "./i18n.js";

function msg(ar, en) {
  return getLang() === "ar" ? ar : en;
}

function localReply(text) {
  if (/عرفات|منى|مزدلفة|مسار|الشعائر/i.test(text)) {
    return msg(
      "ابدأ بمتابعة تسلسل المناسك من اللوحة الزمنية للحملة، وراجع مشرف الحملة إذا احتجت نقطة تجمع محددة.",
      "Follow the ritual sequence from the campaign timeline and check with your campaign supervisor if you need a specific meeting point."
    );
  }
  if (/ضعت|فقدت|مفقود|فقدان/i.test(text)) {
    return msg(
      "استخدم صفحة الطوارئ واختر بلاغ فقدان مع تحديد آخر موقع معروف، وسيتم تسجيل البلاغ داخل النظام.",
      "Use the emergency page, choose the lost-person report type, and provide the last known location so the case is logged."
    );
  }
  if (/دفع|باركود|qr/i.test(text)) {
    return msg(
      "بعد انتقال طلبك إلى مرحلة الدفع وتأكيده، سيظهر لك الباركود مباشرة في لوحة الحاج.",
      "Once your application moves to payment and is confirmed, the QR code will appear directly in the pilgrim dashboard."
    );
  }
  return msg(
    "أستطيع مساعدتك في الحملات، خطوات الرحلة، الطوارئ، ومواعيد التنبيهات الخاصة بالحملة.",
    "I can help with campaigns, journey steps, emergency use, and campaign alert timing."
  );
}

async function askGuide(message) {
  try {
    const response = await fetch(SMART_GUIDE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        lang: getLang()
      })
    });
    if (!response.ok) throw new Error("رفيق حجتي غير متاح");
    const payload = await response.json();
    if (payload.reply) return payload.reply;
  } catch {
    return localReply(message);
  }
  return localReply(message);
}

function appendMessage(type, content) {
  const box = document.getElementById("chatBox");
  const item = document.createElement("div");
  item.className = `msg ${type}`;
  item.textContent = content;
  box.appendChild(item);
  box.scrollTop = box.scrollHeight;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const auth = await requireRole("pilgrim");
    if (!auth) return;
    initShell({ scope: "pilgrim", active: "smart_guide", onLogout: () => signOut() });

    const send = async () => {
      const input = document.getElementById("chatInput");
      const text = input.value.trim();
      if (!text) return;
      appendMessage("user", text);
      input.value = "";
      const reply = await askGuide(text);
      appendMessage("bot", reply);
      await logSmartGuideMessage(auth.session.user.id, text, reply);
    };

    document.getElementById("chatSend").addEventListener("click", () => {
      send().catch((error) => toast(error.message || msg("تعذر إرسال الرسالة.", "Unable to send the message."), "error"));
    });
    document.getElementById("chatInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        send().catch((error) => toast(error.message || msg("تعذر إرسال الرسالة.", "Unable to send the message."), "error"));
      }
    });
    document.querySelectorAll("[data-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById("chatInput").value = button.dataset.prompt;
      });
    });
  } catch (error) {
    toast(error.message || msg("تعذر تحميل التوجيه الذكي.", "Unable to load Smart Guide."), "error");
  }
});
