import { randomUUID } from "node:crypto";
import { CARE_SUPPORT_ENABLED, careCycleWindow, isActiveCarePlan, isCareSupportCategory, type CareRequestType } from "@/lib/care-support";
import { sendVxlEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const privateJson = (body: unknown, init?: ResponseInit) => Response.json(body, {
  ...init,
  headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", ...init?.headers },
});
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
const openStatuses = ["open", "in_progress", "waiting_on_customer"];

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { supabase, userId };
}

export async function GET() {
  if (!CARE_SUPPORT_ENABLED) return privateJson({ error: "Care Support is not enabled." }, { status: 404 });
  const { supabase, userId } = await session();
  if (!userId) return privateJson({ error: "Sign in to view Care Support." }, { status: 401 });
  const [subscriptionResult, requestsResult] = await Promise.all([
    supabase.from("subscriptions").select("plan,status,period_starts_at,period_ends_at").eq("profile_id", userId).maybeSingle(),
    supabase.from("care_support_requests").select("id,reference,request_type,category,subject,message,status,cycle_started_at,created_at,updated_at,resolved_at").eq("profile_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  if (subscriptionResult.error || requestsResult.error) return privateJson({ error: "Care Support is temporarily unavailable." }, { status: 503 });
  const subscription = subscriptionResult.data;
  const eligible = isActiveCarePlan(subscription?.plan, subscription?.status, subscription?.period_ends_at);
  const cycle = eligible ? careCycleWindow(subscription?.period_starts_at, subscription?.period_ends_at) : null;
  const requests = requestsResult.data ?? [];
  const managedUsed = Boolean(cycle && requests.some((request) => request.request_type === "managed_update" && new Date(request.cycle_started_at ?? 0).getTime() === new Date(cycle.startsAt).getTime()));
  return privateJson({
    enabled: true,
    eligible,
    plan: eligible ? "care" : subscription?.plan ?? "free",
    cycle,
    managedUpdatesRemaining: eligible && cycle && !managedUsed ? 1 : 0,
    openRequests: requests.filter((request) => openStatuses.includes(request.status)).length,
    requests,
  });
}

export async function POST(request: Request) {
  if (!CARE_SUPPORT_ENABLED) return privateJson({ error: "Care Support is not enabled." }, { status: 404 });
  const { supabase, userId } = await session();
  if (!userId) return privateJson({ error: "Sign in to contact Care Support." }, { status: 401 });
  const limited = await checkRateLimit(userId, "care_support_request");
  if (limited) return limited;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requestType: CareRequestType = body.requestType === "managed_update" ? "managed_update" : "priority_support";
  const category = body.category;
  const subject = clean(body.subject, 160);
  const message = clean(body.message, 5000);
  if (!isCareSupportCategory(category) || subject.length < 4 || message.length < 20) {
    return privateJson({ error: "Add a category, a clear subject and at least 20 characters of detail." }, { status: 400 });
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan,status,period_starts_at,period_ends_at")
    .eq("profile_id", userId)
    .maybeSingle();
  if (subscriptionError) return privateJson({ error: "Could not confirm your Care access." }, { status: 503 });
  if (!isActiveCarePlan(subscription?.plan, subscription?.status, subscription?.period_ends_at)) {
    return privateJson({ error: "Priority support requires an active Care plan." }, { status: 403 });
  }
  const cycle = careCycleWindow(subscription?.period_starts_at, subscription?.period_ends_at);
  if (!cycle) return privateJson({ error: "Could not determine your current Care cycle." }, { status: 503 });

  const admin = createAdminClient();
  if (requestType === "priority_support") {
    const { count, error } = await admin.from("care_support_requests").select("id", { count: "exact", head: true }).eq("profile_id", userId).in("status", openStatuses);
    if (error) return privateJson({ error: "Could not check your open support requests." }, { status: 503 });
    if ((count ?? 0) >= 3) return privateJson({ error: "You already have three active requests. We’ll progress those before opening another." }, { status: 409 });
  }

  const id = randomUUID();
  const reference = `VXL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id.slice(0, 8).toUpperCase()}`;
  const { data: created, error: insertError } = await admin.from("care_support_requests").insert({
    id,
    profile_id: userId,
    reference,
    request_type: requestType,
    category,
    subject,
    message,
    cycle_started_at: requestType === "managed_update" ? cycle.startsAt : null,
  }).select("id,reference,request_type,category,subject,message,status,cycle_started_at,created_at,updated_at,resolved_at").single();
  if (insertError?.code === "23505" && requestType === "managed_update") {
    return privateJson({ error: "Your managed update for this 28-day cycle has already been requested." }, { status: 409 });
  }
  if (insertError || !created) return privateJson({ error: "Could not create your support request." }, { status: 503 });

  const { data: profile } = await admin.from("profiles").select("full_name,email,portfolio_slug").eq("id", userId).maybeSingle();
  const memberName = clean(profile?.full_name, 120) || "VXL member";
  const memberEmail = clean(profile?.email, 254);
  const supportEmail = process.env.VXL_SUPPORT_EMAIL || process.env.VXL_REPLY_TO_EMAIL || "hello@thevxl.com";
  const kindLabel = requestType === "managed_update" ? "Managed portfolio update" : "Priority support";
  const safeMessage = escapeHtml(message);
  const teamEmail = sendVxlEmail({
    to: supportEmail,
    subject: `[${reference}] ${kindLabel}: ${subject}`,
    text: `${kindLabel}\nReference: ${reference}\nMember: ${memberName}\nEmail: ${memberEmail || "Unavailable"}\nPortfolio: ${profile?.portfolio_slug || "Unavailable"}\nCategory: ${category}\n\n${message}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h1>${escapeHtml(kindLabel)}</h1><p><b>Reference:</b> ${reference}</p><p><b>Member:</b> ${escapeHtml(memberName)}</p><p><b>Email:</b> ${escapeHtml(memberEmail || "Unavailable")}</p><p><b>Portfolio:</b> ${escapeHtml(String(profile?.portfolio_slug || "Unavailable"))}</p><p><b>Category:</b> ${escapeHtml(category)}</p><hr><p style="white-space:pre-wrap">${safeMessage}</p></div>`,
  }, `care-${id}-team`);
  const memberEmailResult = memberEmail ? sendVxlEmail({
    to: memberEmail,
    subject: `We received your VXL Care request · ${reference}`,
    text: `Hi ${memberName},\n\nWe received your ${kindLabel.toLowerCase()}.\nReference: ${reference}\nSubject: ${subject}\nStatus: Open\n\nYou can follow its status inside VXL → Care Support.\n\nVXL support`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h1>We received your Care request</h1><p>Hi ${escapeHtml(memberName)},</p><p>Your <b>${escapeHtml(kindLabel.toLowerCase())}</b> is now in the priority queue.</p><p><b>Reference:</b> ${reference}<br><b>Subject:</b> ${escapeHtml(subject)}<br><b>Status:</b> Open</p><p>You can follow its status inside VXL → Care Support.</p></div>`,
  }, `care-${id}-member`) : Promise.resolve({ sent: false as const, queued: false, reason: "missing_email" as const });
  const [teamDelivery, memberDelivery] = await Promise.all([teamEmail, memberEmailResult]);

  return privateJson({
    ok: true,
    request: created,
    notifications: { team: teamDelivery.sent || teamDelivery.queued, member: memberDelivery.sent || memberDelivery.queued },
  }, { status: 201 });
}
