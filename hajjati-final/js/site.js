export const ROUTES = {
  home: "/pages/primaryHome.html",
  loginSelection: "/pages/login.html",
  registerSelection: "/pages/register.html",
  pilgrimLogin: "/pages/login-haj.html",
  providerLogin: "/pages/company-login.html",
  pilgrimRegister: "/pages/register-haj.html",
  providerRegister: "/pages/company-register.html",
  otp: "/pages/otp.html",
  pilgrimDashboard: "/pages/pilgrim-dashboard.html",
  providerDashboard: "/pages/provider-dashboard.html",
  pilgrimCampaigns: "/pages/pilgrim-campaigns.html",
  providerCampaigns: "/pages/provider-campaigns.html",
  providerScanner: "/pages/provider-scanner.html",
  smartGuide: "/pages/smart-guide.html",
  emergency: "/pages/emergency.html",
  faq: "/pages/faq.html",
  legacyDashboard: "/pages/dashboard.html",
  legacyCampaigns: "/pages/campaigns.html"
};

export const SITE_DATA = {
  supportEmail: "445153931@tvtc.edu.sa",
  supportPhone: "0504516659",
  ministryPhone: "997",
  teamName: {
    ar: "فريق مشروع حجتي",
    en: "Hajjati Graduation Team"
  },
  footerNote: {
    ar: "منصة ثنائية اللغة لإدارة رحلة الحاج ومتابعة الحملات، مع بنية آمنة قابلة للربط مع Supabase والاستضافة السحابية.",
    en: "A bilingual platform for managing the pilgrim journey and campaign operations with a secure architecture ready for Supabase and cloud hosting."
  },
  smartGuideNote: {
    ar: "مفتاح الذكاء الاصطناعي لا يوضع داخل الواجهة الأمامية. أضيفيه في بيئة الاستضافة أو في Edge Function/Serverless Function فقط.",
    en: "Do not place the AI key in the frontend. Add it only in your hosting environment variables or an Edge/Serverless Function."
  },
  teamMembers: [
    {
      name: "رنيم مفرح الاسمري",
      email: "445153931@tvtc.edu.sa",
      role: { ar: "قائدة الفريق", en: "Team Leader" }
    },
    {
      name: "فجر نادر العصيمي",
      email: "445153551@tvtc.edu.sa",
      role: { ar: "عضو فريق", en: "Team Member" }
    },
    
    {
      name: "في محمد العتيبي",
      email: "445153935@tvtc.edu.sa",
      role: { ar: "عضو فريق", en: "Team Member" }
    },
    {
      name: "جواهر ماجد الفراج",
      email: "445153184@tvtc.edu.sa",
      role: { ar: "عضو فريق", en: "Team Member" }
    },
    {
      name: "اريام سليمان المطيري",
      email: "445154273@tvtc.edu.sa",
      role: { ar: "عضو فريق", en: "Team Member" }
    }
  ]
};

export const FAQ_ITEMS = {
  pilgrim: [
    {
      question: {
        ar: "كيف أقدّم على حملة حج من داخل المنصة؟",
        en: "How do I apply to a Hajj campaign through the platform?"
      },
      answer: {
        ar: "بعد تسجيل الدخول كحاج، انتقل إلى صفحة الحملات، راجع التفاصيل والسعر والسكن والشروط، ثم اضغط على زر التقديم. سيصل الطلب مباشرة إلى صاحب الحملة لمراجعته.",
        en: "After signing in as a pilgrim, go to the campaigns page, review the details, pricing, accommodation, and terms, then submit your request. The campaign owner will receive it for review."
      }
    },
    {
      question: {
        ar: "هل أستطيع القبول النهائي في أكثر من حملة؟",
        en: "Can I be finally accepted in more than one campaign?"
      },
      answer: {
        ar: "لا. يمكن تقديم عدة طلبات مبدئية بحسب التصميم، لكن القبول النشط والدفع النهائي مرتبطان بحملة واحدة فقط لضمان تنظيم الرحلة ومنع التكرار.",
        en: "No. You may submit initial applications depending on the workflow, but active acceptance and final payment are limited to one campaign only to keep the journey organized and prevent duplication."
      }
    },
    {
      question: {
        ar: "متى يظهر لي رمز الدخول أو الباركود؟",
        en: "When will my entry QR code appear?"
      },
      answer: {
        ar: "يظهر الرمز بعد موافقة صاحب الحملة وتأكيد حالة الدفع داخل النظام. بعد ذلك يتم توليد رمز استخدام واحد فقط ويظهر في لوحة الحاج.",
        en: "The code appears after the campaign owner approves your request and the payment status is confirmed in the system. A one-time QR code is then generated and shown in the pilgrim dashboard."
      }
    },
    {
      question: {
        ar: "كيف أستخدم صفحة الطوارئ أو بلاغات الفقدان؟",
        en: "How do I use the emergency or lost-and-found reporting page?"
      },
      answer: {
        ar: "من صفحة الطوارئ يمكنك اختيار نوع البلاغ، كتابة وصف مختصر، وإرسال الموقع الحالي. البلاغ يُسجل في النظام ليصل إلى الجهة المشرفة أو صاحب الحملة حسب الحالة.",
        en: "From the emergency page, choose the report type, add a short description, and include your current location. The report is logged and routed to the appropriate supervisor or campaign owner."
      }
    }
  ],
  provider: [
    {
      question: {
        ar: "ما البيانات المطلوبة لإنشاء حساب مزود خدمة أو صاحب حملة؟",
        en: "What information is required to create a service-provider or campaign-owner account?"
      },
      answer: {
        ar: "يلزم إدخال الاسم الأول واسم العائلة واسم المنشأة والبريد الإلكتروني ورقم الجوال ورقم الترخيص ورقم السجل التجاري أو الرقم الموحد، حتى يتم إنشاء ملف مهني واضح ومراجعة بيانات الجهة.",
        en: "You need the first name, last name, company name, email, phone number, license number, and commercial registration or unified number to create a clear professional profile for review."
      }
    },
    {
      question: {
        ar: "كيف أستقبل طلبات الحجاج وأديرها باحترافية؟",
        en: "How do I receive and manage pilgrim applications professionally?"
      },
      answer: {
        ar: "من لوحة مزود الخدمة ستظهر لك الحملات المضافة مع عدد الطلبات المعلقة. يمكنك مراجعة بيانات المتقدم، ثم قبول الطلب مع طلب الدفع أو رفضه مع ملاحظة واضحة تحفظ في النظام.",
        en: "From the provider dashboard, your campaigns display with their pending application counts. You can review applicant details, approve with a payment request, or reject with a clear note stored in the system."
      }
    },
    {
      question: {
        ar: "كيف أرسل التنبيهات إلى الحجاج المسجلين في حملتي؟",
        en: "How do I send alerts to pilgrims registered in my campaign?"
      },
      answer: {
        ar: "يمكنك إنشاء تنبيه من صفحة إدارة الحملات، وتحديد الحملة والعنوان والمحتوى والأولوية. بعدها يظهر التنبيه داخل لوحة الحاج المرتبطة بالحملة نفسها.",
        en: "You can create an alert from the campaign management page, choose the campaign, define the title, content, and priority, and it will appear in the relevant pilgrim dashboard."
      }
    },
    {
      question: {
        ar: "كيف يعمل نظام التحقق بالباركود عند نقطة التجمع؟",
        en: "How does the QR verification system work at the gathering point?"
      },
      answer: {
        ar: "بعد سداد الحاج وتأكيده، يتم توليد رمز QR أحادي الاستخدام. في صفحة الماسح يكتب مزود الخدمة الرمز أو يربطه بكاميرا المتصفح لاحقًا، ثم يتحقق النظام من صحة الرمز ويعلّمه كمستخدم لمنع تكراره.",
        en: "After payment is confirmed, the pilgrim receives a one-time QR code. On the scanner page, the provider can enter the code or later connect browser camera scanning, and the system validates then marks it as used."
      }
    }
  ]
};

export const DEMO_CAMPAIGNS = [
  {
    id: "demo-campaign-1",
    title_ar: "حملة اليسر المميزة",
    title_en: "Al Yusr Premium Campaign",
    city: "مكة المكرمة",
    price: 14800,
    capacity: 180,
    seats_left: 42,
    duration_days: 12,
    status: "open",
    description_ar: "حملة متكاملة تشمل السكن القريب، النقل، الإشراف الميداني، والتنبيهات اللحظية للحجاج.",
    description_en: "A comprehensive campaign with nearby accommodation, transport, field supervision, and real-time pilgrim alerts.",
    terms_ar: "يلتزم الحاج بإكمال البيانات الصحيحة وإحضار التصريح النظامي قبل موعد الانطلاق.",
    terms_en: "Pilgrims must complete accurate data and present a valid permit before departure.",
    accommodation_ar: "سكن قريب من المشاعر مع مشرفين ميدانيين.",
    accommodation_en: "Accommodation near the holy sites with field supervisors.",
    meeting_point: "مركز التجمع - جدة"
  },
  {
    id: "demo-campaign-2",
    title_ar: "حملة السكينة الاقتصادية",
    title_en: "Al Sakinah Economy Campaign",
    city: "مكة المكرمة",
    price: 9700,
    capacity: 220,
    seats_left: 80,
    duration_days: 10,
    status: "open",
    description_ar: "خيار اقتصادي منظم مع سكن جماعي ونقل مجدول وتواصل مستمر مع قائد الحملة.",
    description_en: "An organized economy option with group accommodation, scheduled transport, and direct communication with the campaign lead.",
    terms_ar: "الأولوية للمكتملين للوثائق ويجب الالتزام بجدول التجمع والتنقل.",
    terms_en: "Priority goes to applicants with complete documents, and all travelers must follow the gathering and transport schedule.",
    accommodation_ar: "سكن جماعي منظم بالقرب من مسار التنقل.",
    accommodation_en: "Organized shared accommodation near the transit route.",
    meeting_point: "مركز التجمع - الرياض"
  },
  {
    id: "demo-campaign-3",
    title_ar: "حملة الوفد الذهبي",
    title_en: "Golden Delegation Campaign",
    city: "المدينة المنورة",
    price: 18600,
    capacity: 90,
    seats_left: 16,
    duration_days: 14,
    status: "open",
    description_ar: "خدمة ضيافة عالية مع متابعة صحية أولية، وجبات، ومجموعة تنبيهات خاصة بالحملة.",
    description_en: "High-touch hospitality service with primary health follow-up, meals, and campaign-specific alerts.",
    terms_ar: "يشترط إكمال البيانات الطبية الأساسية وتأكيد وسيلة التواصل الفعالة.",
    terms_en: "Basic health data and a verified communication channel are required.",
    accommodation_ar: "غرف فندقية بإشراف خدمة عملاء مخصص.",
    accommodation_en: "Hotel rooms with dedicated customer support.",
    meeting_point: "مركز التجمع - المدينة"
  }
];

export function getRoleLabel(role, lang = "ar") {
  const normalized = role === "provider" ? "owner" : role;
  const labels = {
    pilgrim: { ar: "حاج", en: "Pilgrim" },
    owner: { ar: "مزود خدمة / صاحب حملة", en: "Service Provider / Campaign Owner" }
  };
  return labels[normalized]?.[lang] ?? labels.pilgrim[lang];
}

export function maskContact(value = "") {
  if (!value) return "";
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    const start = name.slice(0, 2);
    return `${start}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
  }
  if (value.length < 5) return value;
  return `${value.slice(0, 3)}${"*".repeat(Math.max(value.length - 5, 2))}${value.slice(-2)}`;
}
