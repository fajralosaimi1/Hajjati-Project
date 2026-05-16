// faq.js — JavaScript لصفحة الأسئلة الشائعة

var allFaqs = [];

function getById(id) {
  return document.getElementById(id);
}

function normalizeText(value) {
  return String(value || "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

function showCat(btn, catId) {
  var searchResults = getById("search-results");
  var searchInput = getById("search-input");
  var targetSection = getById("cat-" + catId);
  if (!targetSection) return;

  document.querySelectorAll(".cat-btn").forEach(function(b) { b.classList.remove("active"); });
  if (btn) btn.classList.add("active");
  if (searchResults) searchResults.classList.remove("active");
  if (searchInput) searchInput.value = "";

  document.querySelectorAll(".faq-section").forEach(function(sec) { sec.classList.remove("active"); });
  targetSection.classList.add("active");
}

function toggleFaq(item) {
  if (!item) return;
  var isOpen = item.classList.contains("open");
  var scope = item.closest(".faq-section") || getById("search-items") || document;
  scope.querySelectorAll(".faq-item.open").forEach(function(el) { el.classList.remove("open"); });
  if (!isOpen) item.classList.add("open");
}

function buildFaqIndex() {
  allFaqs = [];
  document.querySelectorAll(".faq-section .faq-item").forEach(function(item) {
    var question = item.querySelector(".faq-q span");
    var answer = item.querySelector(".faq-a-inner");
    if (!question || !answer) return;
    allFaqs.push({
      q: question.textContent,
      a: answer.textContent,
      qNorm: normalizeText(question.textContent),
      aNorm: normalizeText(answer.textContent),
      node: item.cloneNode(true)
    });
  });
}

function searchFaq(query) {
  var q = normalizeText(query);
  var searchResults = getById("search-results");
  var generalSection = getById("cat-general");
  var searchLabel = getById("search-label");
  var container = getById("search-items");
  if (!searchResults || !generalSection || !searchLabel || !container) return;

  if (!q) {
    searchResults.classList.remove("active");
    document.querySelectorAll(".faq-section").forEach(function(sec) { sec.classList.remove("active"); });
    generalSection.classList.add("active");
    document.querySelectorAll(".cat-btn").forEach(function(b, i) { b.classList.toggle("active", i === 0); });
    container.innerHTML = "";
    return;
  }

  document.querySelectorAll(".faq-section").forEach(function(sec) { sec.classList.remove("active"); });
  searchResults.classList.add("active");

  var results = allFaqs.filter(function(faq) {
    return faq.qNorm.indexOf(q) !== -1 || faq.aNorm.indexOf(q) !== -1;
  });

  searchLabel.innerHTML = 'نتائج البحث عن: <span>"' + query.trim() + '"</span> — ' + toAr(results.length) + ' نتيجة';
  container.innerHTML = "";

  if (!results.length) {
    container.innerHTML = '<div class="no-results"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><div class="no-results-text">لم نجد نتائج مطابقة — جرّب كلمات أخرى</div></div>';
    return;
  }

  results.forEach(function(faq) {
    var clone = faq.node.cloneNode(true);
    clone.onclick = function() { toggleFaq(clone); };
    container.appendChild(clone);
  });
}

function toAr(n) {
  return String(n).replace(/\d/g, function(d) { return "٠١٢٣٤٥٦٧٨٩"[d]; });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildFaqIndex);
} else {
  buildFaqIndex();
}

window.showCat = showCat;
window.toggleFaq = toggleFaq;
window.searchFaq = searchFaq;
