import { applyLang, getLang, setLang, t } from "./i18n.js";
import { ROUTES, SITE_DATA } from "./site.js";

function navItems(scope) {
  if (scope === "pilgrim") {
    return [
      { href: ROUTES.pilgrimDashboard, key: "dashboard" },
      { href: ROUTES.pilgrimCampaigns, key: "campaigns" },
      { href: ROUTES.smartGuide, key: "smart_guide" },
      { href: ROUTES.emergency, key: "emergency" },
      { href: ROUTES.faq, key: "faq" }
    ];
  }
  if (scope === "provider") {
    return [
      { href: ROUTES.providerDashboard, key: "dashboard" },
      { href: ROUTES.providerCampaigns, key: "campaigns" },
      { href: ROUTES.providerScanner, key: "scanner" },
      { href: ROUTES.emergency, key: "emergency" },
      { href: ROUTES.faq, key: "faq" }
    ];
  }
  return [
    { href: ROUTES.home, key: "home" },
    { href: ROUTES.loginSelection, key: "login" },
    { href: ROUTES.registerSelection, key: "register" },
    { href: ROUTES.faq, key: "faq" }
  ];
}

function actionButtons(scope) {
  if (scope === "pilgrim") {
    return `
      <a class="btn btn-soft" href="${ROUTES.pilgrimDashboard}" data-i18n-text="dashboard">اللوحة</a>
      <button class="btn btn-outline-light" type="button" data-logout data-i18n-text="logout">تسجيل الخروج</button>
    `;
  }
  if (scope === "provider") {
    return `
      <a class="btn btn-soft" href="${ROUTES.providerDashboard}" data-i18n-text="dashboard">اللوحة</a>
      <button class="btn btn-outline-light" type="button" data-logout data-i18n-text="logout">تسجيل الخروج</button>
    `;
  }
  return `
    <a class="btn btn-soft" href="${ROUTES.loginSelection}" data-i18n-text="login">تسجيل الدخول</a>
    <a class="btn btn-outline-light" href="${ROUTES.registerSelection}" data-i18n-text="register">إنشاء حساب</a>
  `;
}

function headerMarkup(scope, active) {
  const items = navItems(scope)
    .map(item => `
      <a class="nav-link ${active === item.key ? "active" : ""}" href="${item.href}" data-i18n-text="${item.key}">
        ${t(item.key)}
      </a>
    `).join("");

  return `
    <div class="gov-bar">
      <div class="container gov-bar-inner">
        <div class="gov-copy">
          <span data-i18n-text="gov_sa">${t("gov_sa")}</span>
          <span class="gov-sep"></span>
          <span data-i18n-text="gov_ministry">${t("gov_ministry")}</span>
        </div>
        <div class="gov-copy muted-line">
          <span>Hajjati</span>
          <span class="gov-sep"></span>
          <span data-i18n-text="secure_experience">${t("secure_experience")}</span>
        </div>
      </div>
    </div>
    <header class="site-header">
      <div class="container site-header-inner">
        <a class="brand" href="${ROUTES.home}">
          <span class="brand-mark" aria-hidden="true">
            <img src="/assets/logo.svg" alt="حجتي" style="height:44px;">
          </span>
        </a>
        <button class="menu-toggle" id="menuToggle" type="button" aria-expanded="false" aria-controls="mainNav">
          <span></span><span></span><span></span>
        </button>
        <div class="site-nav-wrap" id="mainNav">
          <nav class="site-nav">${items}</nav>
          <div class="site-actions">
            ${actionButtons(scope)}
          </div>
        </div>
      </div>
    </header>
  `;
}

// ✅ حذف زر اللغة من الهيدر نهائياً — يسبب reload يخرب الجلسة

function footerLinks() {
  return [
    { href: ROUTES.home, key: "home" },
    { href: ROUTES.loginSelection, key: "login" },
    { href: ROUTES.registerSelection, key: "register" },
    { href: ROUTES.faq, key: "faq" }
  ].map(link => `
    <a class="footer-link" href="${link.href}" data-i18n-text="${link.key}">
      ${t(link.key)}
    </a>
  `).join("");
}

function teamMarkup() {
  const lang = getLang();
  return SITE_DATA.teamMembers.map(member => `
    <div class="team-line">
      <strong>${member.name}</strong>
      <span>${member.role[lang]}</span>
      <a class="footer-link" href="mailto:${member.email}">${member.email}</a>
    </div>
  `).join("");
}

function footerMarkup() {
  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <section class="footer-block footer-brand-block">
          <div class="footer-brand">
            <span class="brand-mark" aria-hidden="true">
              <img src="/assets/logo.svg" alt="حجتي" style="height:44px;">
            </span>
          </div>
          <p class="footer-note">${SITE_DATA.footerNote[getLang()]}</p>
        </section>
        <section class="footer-block">
          <h3 data-i18n-text="footer_links">${t("footer_links")}</h3>
          <div class="footer-list">${footerLinks()}</div>
        </section>
        <section class="footer-block">
          <h3 data-i18n-text="footer_contact">${t("footer_contact")}</h3>
          <div class="footer-list">
            <a class="footer-link" href="mailto:${SITE_DATA.supportEmail}">${SITE_DATA.supportEmail}</a>
            <a class="footer-link" href="tel:${SITE_DATA.supportPhone}">${SITE_DATA.supportPhone}</a>
            <a class="footer-link" href="tel:${SITE_DATA.ministryPhone}">${SITE_DATA.ministryPhone}</a>
          </div>
        </section>
        <section class="footer-block">
          <h3 data-i18n-text="footer_team">${t("footer_team")}</h3>
          <div class="footer-team">${teamMarkup()}</div>
        </section>
      </div>
      <div class="container footer-bottom">
        <span>${SITE_DATA.teamName[getLang()]}</span>
        <span>
          <span data-i18n-text="leader_phone">${t("leader_phone")}</span>:
          <a class="footer-link inline" href="tel:${SITE_DATA.supportPhone}">${SITE_DATA.supportPhone}</a>
        </span>
      </div>
    </footer>
  `;
}

function bindMenu() {
  const toggle = document.getElementById("menuToggle");
  const panel = document.getElementById("mainNav");
  if (!toggle || !panel) return;
  toggle.addEventListener("click", () => {
    const next = !panel.classList.contains("open");
    panel.classList.toggle("open", next);
    toggle.setAttribute("aria-expanded", String(next));
  });
}

function ensureToastRoot() {
  if (document.getElementById("toastRoot")) return;
  const root = document.createElement("div");
  root.id = "toastRoot";
  root.className = "toast-root";
  document.body.appendChild(root);
}

export function toast(message, variant = "info") {
  ensureToastRoot();
  const root = document.getElementById("toastRoot");
  const item = document.createElement("div");
  item.className = `toast ${variant}`;
  item.textContent = message;
  root.appendChild(item);
  window.setTimeout(() => item.classList.add("show"), 10);
  window.setTimeout(() => {
    item.classList.remove("show");
    window.setTimeout(() => item.remove(), 240);
  }, 3200);
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("modal-open");
}

export function bindCommon() {
  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });
}

export function initShell({ scope = "public", active = "home", onLogout } = {}) {
  document.body.dataset.shellScope = scope;
  document.body.dataset.shellActive = active;

  const top = document.getElementById("shell-top");
  const bottom = document.getElementById("shell-bottom");
  if (top) top.innerHTML = headerMarkup(scope, active);
  if (bottom) bottom.innerHTML = footerMarkup();

  bindMenu();
  bindCommon();
  ensureToastRoot();

  // ✅ FIX: حذف window.location.reload() من زر اللغة
  // الآن يغير اللغة بدون إعادة تحميل الصفحة — يحافظ على الجلسة
  document.querySelectorAll("[data-lang]").forEach(button => {
    button.addEventListener("click", () => {
      const { setLang: sl, applyLang: al } = { setLang, applyLang };
      sl(button.dataset.lang);
      al();
    });
  });

  if (onLogout) {
    document.querySelectorAll("[data-logout]").forEach(button => {
      button.addEventListener("click", onLogout);
    });
  }

  applyLang();
}

window.HAJJATI_APP = { toast, openModal, closeModal, bindCommon, initShell };
