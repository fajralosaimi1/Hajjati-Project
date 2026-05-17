// ─── مهم: يخبر Vercel إن هذا Edge Function ───
export const config = { runtime: "edge" };

function fallbackReply(message, lang) {
  if (/عرفات|منى|مزدلفة|شعائر|مسار/i.test(message)) {
    return lang === "ar"
      ? "راجع خطوات المناسك الأساسية من لوحة الحاج وتابع تعليمات الحملة في التنبيهات."
      : "Review the ritual flow from the pilgrim dashboard and follow your campaign alerts.";
  }
  if (/فقدان|مفقود|lost/i.test(message)) {
    return lang === "ar"
      ? "استخدم صفحة الطوارئ واختر بلاغ فقدان مع كتابة آخر موقع معروف ووسيلة التواصل."
      : "Use the emergency page, choose the lost-person report type, and include the last known location.";
  }
  return lang === "ar"
    ? "عذراً، تعذّر الاتصال بالمساعد. حاول مجدداً."
    : "Sorry, could not reach the assistant. Please try again.";
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const body = await request.json().catch(() => ({}));
  const lastMessage = Array.isArray(body.messages)
    ? [...body.messages].reverse().find((item) => item?.role === "user")?.content
    : "";
  const message = String(body.message || lastMessage || "").trim();
  const lang = body.lang === "en" ? "en" : "ar";

  if (!message) {
    return json(
      {
        reply: lang === "ar" ? "اكتب سؤالك أولاً." : "Please enter a question first.",
        mode: "validation"
      },
      400
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model  = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return json({
      reply: fallbackReply(message, lang),
      mode: "fallback"
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              lang === "ar"
                ? "أنت رفيق حجتي، مرشد ذكي داخل منصة حج. أجب بإيجاز وبأسلوب رسمي لطيف، وركز على المناسك، التنبيهات، الحملات، والطوارئ."
                : "You are Rafiq Hajjati, a smart guide inside a Hajj platform. Reply briefly in a calm formal style, focusing on rituals, alerts, campaigns, and emergencies."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("OpenAI error:", response.status, errText);
      return json({
        reply: fallbackReply(message, lang),
        mode: "fallback"
      });
    }

    const payload = await response.json();
    const reply = payload.choices?.[0]?.message?.content || fallbackReply(message, lang);
    return json({ reply, mode: "openai" });
  } catch (err) {
    console.error("smart-guide error:", err);
    return json({
      reply: fallbackReply(message, lang),
      mode: "fallback"
    });
  }
};
