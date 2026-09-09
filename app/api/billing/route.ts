import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { planRequestReceivedEmail } from "@/lib/email-templates";
import { sendVxlEmail } from "@/lib/email";
import { PLAN_PRICES, type BillingCycle, type PaidPlan as Plan } from "@/lib/plans";

const PRICES = {
  live: { "28_days": PLAN_PRICES.live["28_days"] * 100, annual: PLAN_PRICES.live.annual * 100 },
  flex: { "28_days": PLAN_PRICES.flex["28_days"] * 100, annual: PLAN_PRICES.flex.annual * 100 },
  care: { "28_days": PLAN_PRICES.care["28_days"] * 100, annual: PLAN_PRICES.care.annual * 100 },
} as const;

const PLAN_EMAIL_DETAILS = {
  live: {
    summary: "Your polished portfolio stays securely online with every template included.",
  },
  flex: {
    summary: "Keep your portfolio live while updating your professional story whenever it changes.",
  },
  care: {
    summary: "Get the complete VXL experience with hands-on support for important updates.",
  },
} as const;


async function authorized() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { supabase, userId };
}

export async function GET() {
  const { supabase, userId } = await authorized();
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  let { data: referral } = await supabase.from("referral_codes").select("code,is_active").eq("profile_id", userId).maybeSingle();
  if (!referral) {
    for (let attempt = 0; attempt < 3 && !referral; attempt += 1) {
      const code = `VXL-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const created = await supabase.from("referral_codes").insert({ profile_id: userId, code }).select("code,is_active").single();
      if (!created.error) referral = created.data;
    }
  }

  const [
    { data: requests, error: requestsError },
    { data: attribution, error: attributionError },
    { data: subscription, error: subscriptionError },
  ] = await Promise.all([
    supabase.from("plan_requests").select("id,plan,billing_cycle,amount_paise,status,created_at").eq("profile_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("referral_attributions").select("referral_code,status").eq("referred_profile_id", userId).maybeSingle(),
    supabase.from("subscriptions").select("plan,status,period_starts_at,period_ends_at,updated_at").eq("profile_id", userId).maybeSingle(),
  ]);
  const error = requestsError || attributionError || subscriptionError;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let usage = null;
  if (subscription?.status === "active" && subscription.period_starts_at && subscription.period_ends_at) {
    const start = new Date(subscription.period_starts_at).getTime();
    const end = new Date(subscription.period_ends_at).getTime();
    const now = Math.min(Date.now(), end);
    const cycleMs = 28 * 86_400_000;
    const cycleStartsAt = new Date(start + Math.max(0, Math.floor((now - start) / cycleMs)) * cycleMs);
    const cycleEndsAt = new Date(Math.min(end, cycleStartsAt.getTime() + cycleMs));
    const { data: events } = await supabase.from("subscription_usage_events").select("entitlement,units").eq("profile_id", userId).gte("occurred_at", cycleStartsAt.toISOString()).lt("occurred_at", cycleEndsAt.toISOString());
    usage = { cycleStartsAt: cycleStartsAt.toISOString(), cycleEndsAt: cycleEndsAt.toISOString(), published_updates: 0, resume_reimports: 0, ai_improvements: 0 };
    for (const event of events ?? []) {
      const key = event.entitlement as keyof Pick<typeof usage, "published_updates" | "resume_reimports" | "ai_improvements">;
      if (key in usage) usage[key] += Number(event.units) || 0;
    }
  }
  return Response.json({ referral, attribution, requests, subscription, usage });
}

export async function POST(request: Request) {
  const { supabase, userId } = await authorized();
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const limited = await checkRateLimit(userId, "plan_request");
  if (limited) return limited;
  const body = await request.json().catch(() => ({})) as { plan?: string; billingCycle?: string; referralCode?: string };
  if (!(body.plan && body.plan in PRICES)) return Response.json({ error: "Choose a valid plan." }, { status: 400 });
  if (body.billingCycle !== "28_days" && body.billingCycle !== "annual") return Response.json({ error: "Choose a valid billing cycle." }, { status: 400 });
  const plan = body.plan as Plan;
  const billingCycle = body.billingCycle as BillingCycle;
  const referralCode = body.referralCode?.trim().toUpperCase() ?? "";

  if (referralCode) {
    const { error } = await supabase.rpc("apply_referral_code", { input_code: referralCode });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,email").eq("id", userId).single();
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });
  const { data: planRequest, error } = await supabase.from("plan_requests").insert({
    profile_id: userId,
    plan,
    billing_cycle: billingCycle,
    amount_paise: PRICES[plan][billingCycle],
    email: profile.email,
    referral_code: referralCode,
  }).select("id").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const cycleLabel = billingCycle === "annual" ? "1 year" : "28 days";
  const amount = `₹${PRICES[plan][billingCycle] / 100}`;
  const acknowledgement = planRequestReceivedEmail({
    name: profile.full_name?.trim() || profile.email.split("@")[0],
    requestId: planRequest.id,
    plan: plan.toUpperCase(),
    cycle: cycleLabel,
    amount,
    ...PLAN_EMAIL_DETAILS[plan],
  });
  const delivery = await sendVxlEmail({ to: profile.email, ...acknowledgement }, `plan-request-${planRequest.id}`);

  if (!delivery.sent) {
    console.error("[vxl-billing] acknowledgement_failed", { reason: delivery.reason });
    return Response.json({
      error: "Your request was saved, but we could not send the confirmation email. Please try again shortly.",
      requestId: planRequest.id,
      acknowledgementSent: false,
    }, { status: 503 });
  }

  return Response.json({ ok: true, requestId: planRequest.id, acknowledgementSent: true }, { status: 201 });
}
