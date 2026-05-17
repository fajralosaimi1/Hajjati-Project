import { DEMO_CAMPAIGNS } from "./site.js";
import { assertSupabase, supabase } from "./supabaseClient.js";

function toIsoNow() {
  return new Date().toISOString();
}

export function localizedField(row, arField, enField, fallback = "—") {
  if (!row) return fallback;
  const lang = localStorage.getItem("hajjati-lang") || "ar";
  return lang === "ar" ? row[arField] || fallback : row[enField] || row[arField] || fallback;
}

export function formatPrice(value) {
  const lang = localStorage.getItem("hajjati-lang") || "ar";
  if (lang === "ar") {
    return `${Number(value || 0).toLocaleString("ar-SA")} ر.س`;
  }
  return `SAR ${Number(value || 0).toLocaleString("en-US")}`;
}

// ✅ الإصلاح: يحسب المقاعد المحجوزة بناءً على الدفع فقط (بدون شرط qr_token)
function confirmedSeatCount(rows) {
  return (rows || []).filter((item) => item.payment_status === "paid").length;
}

async function countConfirmedSeats(campaignId) {
  if (!supabase || !campaignId || String(campaignId).startsWith("demo-")) return 0;
  const { data, error } = await supabase
    .from("campaign_applications")
    .select("id, payment_status, qr_token")
    .eq("campaign_id", campaignId);
  if (error) return 0;
  return confirmedSeatCount(data);
}

async function computeSeatsLeft(campaign) {
  if (!campaign?.id) return Number(campaign?.seats_left ?? campaign?.capacity ?? 0);
  const confirmedSeats = await countConfirmedSeats(campaign.id);
  return Math.max(Number(campaign.capacity || 0) - confirmedSeats, 0);
}

async function refreshCampaignSeats(campaignId) {
  if (!supabase || !campaignId || String(campaignId).startsWith("demo-")) return null;
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, capacity")
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !campaign) return null;

  const seatsLeft = await computeSeatsLeft(campaign);
  await supabase
    .from("campaigns")
    .update({ seats_left: seatsLeft })
    .eq("id", campaignId);
  return seatsLeft;
}

async function withComputedSeats(rows) {
  if (!supabase) return rows || [];
  return Promise.all((rows || []).map(async (row) => ({
    ...row,
    confirmed_seats: await countConfirmedSeats(row.id),
    seats_left: await computeSeatsLeft(row)
  })));
}

export async function loadCampaigns() {
  if (!supabase) return DEMO_CAMPAIGNS;
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .in("status", ["open", "active"])
    .order("created_at", { ascending: false });
  if (error) return DEMO_CAMPAIGNS;
  return data?.length ? await withComputedSeats(data) : DEMO_CAMPAIGNS;
}

export async function loadPilgrimApplications(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("campaign_applications")
    .select("*, campaigns(*)")
    .eq("pilgrim_id", userId)
    .order("applied_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function createApplication(userId, campaignId) {
  assertSupabase();
  const existing = await supabase
    .from("campaign_applications")
    .select("id")
    .eq("pilgrim_id", userId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (existing.data?.id) {
    throw new Error("سبق أن قدّمت على هذه الحملة.");
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, capacity")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError) throw campaignError;
  if (campaign) {
    const seatsLeft = await computeSeatsLeft(campaign);
    if (seatsLeft <= 0) {
      throw new Error("عذراً، اكتملت مقاعد هذه الحملة.");
    }
  }

  const { data, error } = await supabase
    .from("campaign_applications")
    .insert({
      pilgrim_id: userId,
      campaign_id: campaignId,
      status: "pending",
      payment_status: "unpaid",
      applied_at: toIsoNow()
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function confirmMockPayment(applicationId) {
  assertSupabase();
  const qrToken = crypto.randomUUID();
  const { data, error } = await supabase
    .from("campaign_applications")
    .update({
      status: "paid",
      payment_status: "paid",
      qr_token: qrToken
    })
    .eq("id", applicationId)
    .select("*, campaigns(*)")
    .single();
  if (error) throw error;
  const seatsLeft = await refreshCampaignSeats(data.campaign_id);
  if (data.campaigns && seatsLeft !== null) {
    data.campaigns.seats_left = seatsLeft;
  }
  return data;
}

export async function loadNotifications(userId, role) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return [];
  if (role === "owner") return data || [];
  return (data || []).filter((item) => item.audience !== "owner_only");
}

export async function loadProviderCampaigns(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return await withComputedSeats(data || []);
}

export async function createCampaign(payload, userId) {
  assertSupabase();
  const ownerId = userId || payload.provider_id || payload.owner_id;
  const campaignName = payload.titleAr || payload.name || "حملة حج";
  const description = payload.descriptionAr || payload.description || campaignName;
  const capacity = Number(payload.capacity || 0);
  const insertPayload = {
    owner_id: ownerId,
    title_ar: campaignName,
    title_en: payload.titleEn || payload.name || campaignName,
    city: payload.city || "مكة المكرمة",
    meeting_point: payload.meetingPoint || payload.meeting_point || "نقطة التجمع",
    accommodation_ar: payload.accommodationAr || payload.accommodation_ar || "سكن منظم للحجاج",
    accommodation_en: payload.accommodationEn || payload.accommodation_en || "Organized pilgrim accommodation",
    price: Number(payload.price || 0),
    capacity,
    seats_left: Number(payload.seats_left ?? capacity),
    duration_days: Number(payload.durationDays || payload.duration_days || 10),
    description_ar: description,
    description_en: payload.descriptionEn || payload.description || description,
    terms_ar: payload.termsAr || payload.terms_ar || "الالتزام بتعليمات الحملة وإكمال البيانات المطلوبة.",
    terms_en: payload.termsEn || payload.terms_en || "Follow campaign instructions and complete the required data.",
    status: payload.status || "open"
  };
  const { data, error } = await supabase
    .from("campaigns")
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadApplicationsForOwner(ownerId) {
  if (!supabase) return [];
  const campaigns = await loadProviderCampaigns(ownerId);
  if (!campaigns.length) return [];
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const { data, error } = await supabase
    .from("campaign_applications")
    .select("*")
    .in("campaign_id", campaignIds)
    .order("applied_at", { ascending: false });
  if (error) return [];

  const pilgrimIds = [...new Set((data || []).map((item) => item.pilgrim_id))];
  if (!pilgrimIds.length) {
    return (data || []).map((item) => ({
      ...item,
      campaign: campaigns.find((campaign) => campaign.id === item.campaign_id) || null,
      pilgrim: null
    }));
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in("id", pilgrimIds);

  return (data || []).map((item) => ({
    ...item,
    campaign: campaigns.find((campaign) => campaign.id === item.campaign_id) || null,
    pilgrim: (profiles || []).find((profile) => profile.id === item.pilgrim_id) || null
  }));
}

export async function updateApplicationStatus(applicationId, patch) {
  assertSupabase();
  const normalizedPatch = typeof patch === "string"
    ? (patch === "approved"
        ? { status: "payment_pending", payment_status: "pending" }
        : patch === "rejected"
          ? { status: "rejected", payment_status: "unpaid" }
          : { status: patch })
    : patch;
  const { data, error } = await supabase
    .from("campaign_applications")
    .update({
      ...normalizedPatch,
      reviewed_at: toIsoNow()
    })
    .eq("id", applicationId)
    .select()
    .single();
  if (error) throw error;
  await refreshCampaignSeats(data.campaign_id);
  return data;
}

export async function sendNotification(payload, userId) {
  assertSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      sender_id: userId,
      campaign_id: payload.campaignId || null,
      title_ar: payload.titleAr,
      title_en: payload.titleEn,
      body_ar: payload.bodyAr,
      body_en: payload.bodyEn,
      audience: payload.audience || "campaign_members"
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

function isMissingEmergencyRoutingColumn(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return message.includes("campaign_id") || message.includes("contact_phone") || message.includes("response") || message.includes("resolved_") || message.includes("column");
}

async function findActiveCampaignIdForPilgrim(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from("campaign_applications")
    .select("campaign_id, status, applied_at")
    .eq("pilgrim_id", userId)
    .in("status", ["payment_pending", "paid", "completed", "pending"])
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.campaign_id || null;
}

export async function loadEmergencyReports(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("emergency_reports")
    .select("*")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return [];
  return data || [];
}

export async function createEmergencyReport(payload, userId) {
  assertSupabase();
  const typeMap = { health: "medical", lost: "lost_person", security: "field_support" };
  const reporterId = userId || payload.reporter_id || payload.pilgrim_id;
  const campaignId = payload.campaign_id || payload.campaignId || await findActiveCampaignIdForPilgrim(reporterId);
  const baseReport = {
    reporter_id: reporterId,
    report_type: typeMap[payload.type] || payload.reportType || payload.report_type || "field_support",
    location_text: payload.locationText || payload.location || "",
    message: payload.message || payload.description || "",
    status: "open",
    created_at: toIsoNow()
  };
  const routedReport = {
    ...baseReport,
    campaign_id: campaignId,
    contact_phone: payload.contact_phone || payload.contactPhone || null
  };

  let result = await supabase
    .from("emergency_reports")
    .insert(routedReport)
    .select()
    .single();

  if (result.error && isMissingEmergencyRoutingColumn(result.error)) {
    result = await supabase
      .from("emergency_reports")
      .insert(baseReport)
      .select()
      .single();
  }

  if (result.error) throw result.error;
  return result.data;
}

export async function validateQrForOwner(ownerId, qrToken) {
  assertSupabase();
  const { data: application, error } = await supabase
    .from("campaign_applications")
    .select("*")
    .eq("qr_token", qrToken)
    .maybeSingle();
  if (error) throw error;
  if (!application) {
    return { status: "invalid" };
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", application.campaign_id)
    .maybeSingle();

  if (!campaign || campaign.owner_id !== ownerId) {
    return { status: "invalid" };
  }

  if (application.qr_used) {
    return { status: "used", application, campaign };
  }

  if (application.payment_status !== "paid") {
    return { status: "unpaid", application, campaign };
  }

  const { data: pilgrim } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", application.pilgrim_id)
    .maybeSingle();

  const { data: updated, error: updateError } = await supabase
    .from("campaign_applications")
    .update({
      qr_used: true,
      checked_in_at: toIsoNow(),
      status: "completed"
    })
    .eq("id", application.id)
    .select()
    .single();
  if (updateError) throw updateError;
  return {
    status: "valid",
    application: updated,
    campaign,
    pilgrim
  };
}

export async function logSmartGuideMessage(userId, message, responseText) {
  if (!supabase) return;
  await supabase.from("smart_guide_logs").insert({
    user_id: userId,
    user_message: message,
    assistant_reply: responseText,
    language: localStorage.getItem("hajjati-lang") || "ar"
  });
}

function campaignView(row) {
  if (!row) return row;
  return {
    ...row,
    name: row.name || row.title_ar || row.title_en || "حملة حج",
    description: row.description || row.description_ar || row.description_en || "",
    campaign_type: row.campaign_type || "standard",
    provider_id: row.provider_id || row.owner_id,
    provider_name: row.provider_name || "مزود الخدمة",
    license_number: row.license_number || "—"
  };
}

function applicationView(row) {
  if (!row) return row;
  const campaign = campaignView(row.campaigns || row.campaign);
  const pilgrim = row.profiles || row.pilgrim;
  const viewStatus = row.status === "payment_pending" ? "approved" : row.status;
  return {
    ...row,
    status: viewStatus,
    created_at: row.created_at || row.applied_at,
    qr_code: row.qr_code || row.qr_token,
    campaigns: campaign,
    campaign,
    profiles: pilgrim,
    pilgrim
  };
}

export async function getCampaigns() {
  const rows = await loadCampaigns();
  return rows.map(campaignView);
}

export async function getPilgrimApplications(userId) {
  const rows = await loadPilgrimApplications(userId);
  return rows.map(applicationView);
}

export async function getProviderCampaigns(userId) {
  const rows = await loadProviderCampaigns(userId);
  return rows.map(campaignView);
}

export async function getProviderApplications(userId) {
  const rows = await loadApplicationsForOwner(userId);
  return rows.map(applicationView);
}

function emergencyTypeView(type) {
  const map = { medical: "health", lost_person: "lost", field_support: "security" };
  return map[type] || type || "security";
}

function emergencyReportView(row) {
  const profile = row.profiles || row.profile || null;
  return {
    ...row,
    type: emergencyTypeView(row.type || row.report_type),
    status: row.status === "closed" ? "resolved" : row.status,
    description: row.description || row.message,
    location: row.location || row.location_text,
    response: row.response || "",
    profiles: profile
  };
}

export async function getMyEmergencyReports(userId) {
  const rows = await loadEmergencyReports(userId);
  return rows.map(emergencyReportView);
}

export async function loadEmergencyReportsForOwner(ownerId) {
  if (!supabase) return [];
  const campaigns = await loadProviderCampaigns(ownerId);
  const campaignIds = campaigns.map((campaign) => campaign.id);
  if (!campaignIds.length) return [];

  const { data, error } = await supabase
    .from("emergency_reports")
    .select("*, profiles:reporter_id(id, first_name, last_name, full_name, email, phone)")
    .in("campaign_id", campaignIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

export async function getEmergencyReports(userId) {
  const rows = await loadEmergencyReportsForOwner(userId);
  return rows.map(emergencyReportView);
}

export async function resolveEmergency(reportId, response = "") {
  assertSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const patch = {
    status: "closed",
    response,
    resolved_by: user?.id || null,
    resolved_at: toIsoNow()
  };

  let result = await supabase
    .from("emergency_reports")
    .update(patch)
    .eq("id", reportId)
    .select()
    .single();

  if (result.error && isMissingEmergencyRoutingColumn(result.error)) {
    result = await supabase
      .from("emergency_reports")
      .update({ status: "closed" })
      .eq("id", reportId)
      .select()
      .single();
  }

  if (result.error) throw result.error;
  return result.data;
}

export async function verifyQRCode(qrToken) {
  assertSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { status: "invalid", message: "يجب تسجيل الدخول أولاً." };
  const result = await validateQrForOwner(user.id, qrToken);
  return {
    ...result,
    pilgrim_name: result.pilgrim?.full_name,
    campaign_name: result.campaign?.title_ar || result.campaign?.title_en,
    scanned_at: result.application?.checked_in_at,
    message: result.status === "invalid" ? "الرمز غير صحيح أو لا يتبع لحملاتك." : ""
  };
}
