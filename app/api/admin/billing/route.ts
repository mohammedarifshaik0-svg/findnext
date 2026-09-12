import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminRequest(request))) return Response.json({ error: "Not authorized." }, { status: 401 });
  try {
    const admin = createAdminClient();
    const [p, s, w, e] = await Promise.all([
      admin.from("payment_purchases").select("id,profile_id,mode,plan,billing_cycle,amount_paise,currency,razorpay_order_id,razorpay_payment_id,status,refund_status,activated_at,period_ends_at,created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("subscriptions").select("profile_id,plan,status,period_starts_at,period_ends_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      admin.from("razorpay_webhook_events").select("event_id,event_type,payment_id,mode,status,delivery_count,received_at,last_received_at,processed_at,last_error_category").order("received_at", { ascending: false }).limit(100),
      admin.from("email_delivery_jobs").select("id,dedupe_key,email_to,subject,status,attempts,max_attempts,next_attempt_at,last_error_code,provider_message_id,created_at,updated_at,sent_at").order("created_at", { ascending: false }).limit(100),
    ]);
    const error = p.error || s.error || w.error || e.error;
    if (error) throw error;
    const purchases = p.data ?? [], subscriptions = s.data ?? [];
    const ids = [...new Set([...purchases.map(x => x.profile_id), ...subscriptions.map(x => x.profile_id)])];
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
      },
      purchases: purchases.map(x => ({ ...x, customer: profiles.get(x.profile_id) ?? null })),
      subscriptions: subscriptions.map(x => ({ ...x, customer: profiles.get(x.profile_id) ?? null })),
      webhookEvents: w.data ?? [], emailJobs: e.data ?? [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[vxl-admin] operations_load_failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return Response.json({ error: "Could not load VXL operations." }, { status: 503 });
  }
}
