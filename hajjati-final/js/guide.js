/* ══════════════════════════════════════
   guide.js — JavaScript لصفحة دليل المستخدم
   ١. بيانات المواضيع
   ٢. تبديل نوع المستخدم
   ٣. تبديل الموضوع
   ٤. بناء الشريط الجانبي
══════════════════════════════════════ */


/* ── ١. بيانات المواضيع ── */
var topics = {
  hajj: [
    {
      id: 'hajj-t1',
      label: 'التسجيل والدخول',
      icon: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>'
    },
    {
      id: 'hajj-t2',
      label: 'حجز حملة الحج',
      icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
    },
    {
      id: 'hajj-t3',
      label: 'استخدام المساعد الذكي',
      icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
    },
    {
      id: 'hajj-t4',
      label: 'متابعة الحجز والوثائق',
      icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
    },
    {
      id: 'hajj-t5',
      label: 'التواصل في الطوارئ',
      icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/>'
    }
  ],
  supervisor: [
    {
      id: 'sup-t1',
      label: 'إدارة بيانات الحجاج',
      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
    },
    {
      id: 'sup-t2',
      label: 'إرسال إشعارات جماعية',
      icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/><path d="M11 5H6a2 2 0 0 0-2 2v11l4-4h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1"/>'
    },
    {
      id: 'sup-t3',
      label: 'إدارة حالات الطوارئ',
      icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    }
  ]
};

var currentUser = 'hajj';


/* ── ٢. تبديل نوع المستخدم ── */
function switchUser(btn, user) {
  /* أزرار التبويب */
  document.querySelectorAll('.user-tab').forEach(function(b) {
    b.classList.remove('active');
  });
  btn.classList.add('active');

  /* المحتوى */
  document.querySelectorAll('.user-content').forEach(function(c) {
    c.classList.remove('active');
  });
  document.getElementById('content-' + user).classList.add('active');

  currentUser = user;

  /* إعادة بناء الشريط الجانبي وتفعيل أول موضوع */
  buildSidebar(user);
  showTopic(topics[user][0].id);
}


/* ── ٣. تبديل الموضوع ── */
function showTopic(topicId) {
  /* إخفاء كل المواضيع للمستخدم الحالي */
  document.querySelectorAll('#content-' + currentUser + ' .guide-topic').forEach(function(t) {
    t.classList.remove('active');
  });

  /* إظهار الموضوع المطلوب */
  var el = document.getElementById(topicId);
  if (el) el.classList.add('active');

  /* تحديث الشريط الجانبي */
  document.querySelectorAll('.topic-link').forEach(function(l) {
    l.classList.remove('active');
  });
  var activeLink = document.querySelector('[data-topic="' + topicId + '"]');
  if (activeLink) activeLink.classList.add('active');
}


/* ── ٤. بناء الشريط الجانبي ── */
function buildSidebar(user) {
  var sidebar = document.getElementById('sidebar');
  var list    = topics[user];

  var html = '<div class="sidebar-header">المواضيع</div>';

  list.forEach(function(item, idx) {
    html +=
      '<button class="topic-link' + (idx === 0 ? ' active' : '') + '" ' +
        'data-topic="' + item.id + '" ' +
        'onclick="showTopic(\'' + item.id + '\')">' +
        '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round">' +
          item.icon +
        '</svg>' +
        '<span>' + item.label + '</span>' +
        '<span class="topic-num">' + toAr(idx + 1) + '</span>' +
      '</button>';
  });

  sidebar.innerHTML = html;
}


/* ── مساعد: تحويل أرقام لعربية ── */
function toAr(n) {
  return String(n).replace(/\d/g, function(d) {
    return '٠١٢٣٤٥٦٧٨٩'[d];
  });
}


/* ── تهيئة عند تحميل الصفحة ── */
document.addEventListener('DOMContentLoaded', function() {
  buildSidebar('hajj');
});
