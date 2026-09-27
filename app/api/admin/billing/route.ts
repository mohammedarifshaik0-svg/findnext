import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CARE_SUPPORT_ENABLED, isCareSupportStatus } from "@/lib/care-support";
import { sendVxlEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminRequest(request))) return Response.json({ error: "Not authorized." }, { status: 401 });
  try {
    const admin = createAdminClient();
    const [p, s, w, e, c] = await Promise.all([
      admin.from("payment_purchases").select("id,profile_id,mode,plan,billing_cycle,amount_paise,currency,razorpay_order_id,razorpay_payment_id,status,refund_status,activated_at,period_ends_at,created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("subscriptions").select("profile_id,plan,status,period_starts_at,period_ends_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      admin.from("razorpay_webhook_events").select("event_id,event_type,payment_id,mode,status,delivery_count,received_at,last_received_at,processed_at,last_error_category").order("received_at", { ascending: false }).limit(100),
      admin.from("email_delivery_jobs").select("id,dedupe_key,email_to,subject,status,attempts,max_attempts,next_attempt_at,last_error_code,provider_message_id,created_at,updated_at,sent_at").order("created_at", { ascending: false }).limit(100),
      CARE_SUPPORT_ENABLED
        ? admin.from("care_support_requests").select("id,profile_id,reference,request_type,category,subject,message,status,cycle_started_at,created_at,updated_at,resolved_at").order("created_at", { ascending: false }).limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const error = p.error || s.error || w.error || e.error || c.error;
    if (error) throw error;
    const purchases = p.data ?? [], subscriptions = s.data ?? [];
    const supportRequests = c.data ?? [];
    const ids = [...new Set([...purchases.map(x => x.profile_id), ...subscriptions.map(x => x.profile_id), ...supportRequests.map(x => x.profile_id)])];
    const profileResult = ids.length ? await admin.from("profiles").select("id,full_name,email,portfolio_slug,is_public").in("id", ids) : { data: [], error: null };
    if (profileResult.error) throw profileResult.error;
    const profiles = new Map((profileResult.data ?? []).map(x => [x.id, x]));
    const liveCaptured = purchases.filter(x => x.mode === "live" && x.status === "captured");
    const now = Date.now();
    return Response.json({
      summary: {
        liveRevenuePaise: liveCaptured.reduce((sum, x) => sum + x.amount_paise, 0),
        capturedPayments: liveCaptured.length,
        activeSubscriptions: subscriptions.filter(x => x.status === "active" && new Date(x.period_ends_at ?? 0).getTime() > now).length,
        failedWebhooks: (w.data ?? []).filter(x => x.status === "failed").length,
        pendingEmails: (e.data ?? []).filter(x => x.status === "queued" || x.status === "failed").length,
        openSupportRequests: supportRequests.filter(x => ["open", "in_progress", "waiting_on_customer"].includes(x.status)).length,
      },
      purchases: purchases.map(x => ({ ...x, customer: profiles.get(x.profile_id) ?? null })),
      subscriptions: subscriptions.map(x => ({ ...x, customer: profiles.get(x.profile_id) ?? null })),
      webhookEvents: w.data ?? [], emailJobs: e.data ?? [], supportEnabled: CARE_SUPPORT_ENABLED,
      supportRequests: supportRequests.map(x => ({ ...x, customer: profiles.get(x.profile_id) ?? null })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[vxl-admin] operations_load_failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return Response.json({ error: "Could not load VXL operations." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorizedAdminRequest(request))) return Response.json({ error: "Not authorized." }, { status: 401 });
  if (!CARE_SUPPORT_ENABLED) return Response.json({ error: "Care Support is not enabled." }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { requestId?: unknown; status?: unknown };
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!requestId || !isCareSupportStatus(body.status)) return Response.json({ error: "Choose a valid request and status." }, { status: 400 });
  const admin = createAdminClient();
  const resolved = body.status === "resolved" || body.status === "closed";
  const { data: updated, error } = await admin.from("care_support_requests").update({
    status: body.status,
    updated_at: new Date().toISOString(),
    resolved_at: resolved ? new Date().toISOString() : null,
  }).eq("id", requestId).select("id,profile_id,reference,request_type,category,subject,message,status,cycle_started_at,created_at,updated_at,resolved_at").maybeSingle();
  if (error || !updated) return Response.json({ error: "Could not update that support request." }, { status: 503 });
  const { data: profile } = await admin.from("profiles").select("full_name,email").eq("id", updated.profile_id).maybeSingle();
  if (profile?.email) {
    const label = String(body.status).replaceAll("_", " ");
    await sendVxlEmail({
      to: profile.email,
      subject: `${updated.reference} is now ${label}`,
      text: `Hi ${profile.full_name || "there"},\n\nYour VXL Care request is now ${label}.\nReference: ${updated.reference}\nSubject: ${updated.subject}\n\nOpen VXL → Care Support to view your request history.\n\nVXL support`,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h1>Care request updated</h1><p>Hi ${escapeHtml(String(profile.full_name || "there"))},</p><p>Your VXL Care request is now <b>${escapeHtml(label)}</b>.</p><p><b>Reference:</b> ${updated.reference}<br><b>Subject:</b> ${escapeHtml(updated.subject)}</p><p>Open VXL → Care Support to view your request history.</p></div>`,
    }, `care-${updated.id}-status-${body.status}`);
  }
  return Response.json({ ok: true, request: updated }, { headers: { "Cache-Control": "no-store" } });
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
