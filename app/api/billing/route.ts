import { createClient } from "@/lib/supabase/server";
import { planRequestReceivedEmail } from "@/lib/email-templates";
import { sendFindNextEmail } from "@/lib/email";

const PRICES = {
  live: { "28_days": 5000, annual: 49900 },
  flex: { "28_days": 10000, annual: 99900 },
  care: { "28_days": 25000, annual: 249900 },
} as const;

type Plan = keyof typeof PRICES;
type BillingCycle = keyof typeof PRICES.live;

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
      const code = `FN-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const created = await supabase.from("referral_codes").insert({ profile_id: userId, code }).select("code,is_active").single();
      if (!created.error) referral = created.data;
    }
  }

  const [{ data: requests, error: requestsError }, { data: attribution, error: attributionError }] = await Promise.all([
    supabase.from("plan_requests").select("id,plan,billing_cycle,amount_paise,status,created_at").eq("profile_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("referral_attributions").select("referral_code,status").eq("referred_profile_id", userId).maybeSingle(),
  ]);
  const error = requestsError || attributionError;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ referral, attribution, requests });
}

export async function POST(request: Request) {
  const { supabase, userId } = await authorized();
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
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
  const { data: profile, error: profileError } = await supabase.from("profiles").select("email").eq("id", userId).single();
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

  const cycleLabel = billingCycle === "annual" ? "annual" : "28-day";
  const subject = `FindNext ${plan.toUpperCase()} ${cycleLabel} plan request`;
  const message = `Hello FindNext,\n\nI requested the ${plan.toUpperCase()} ${cycleLabel} plan.\nRequest ID: ${planRequest.id}\nAccount: ${profile.email}\n${referralCode ? `Referral code: ${referralCode}\n` : ""}\nPlease send me the payment instructions and my activation code after verification.`;
  const amount = `₹${PRICES[plan][billingCycle] / 100}`;
  const acknowledgement = planRequestReceivedEmail({ name: profile.email.split("@")[0], requestId: planRequest.id, plan: plan.toUpperCase(), cycle: cycleLabel, amount });
  const delivery = await sendFindNextEmail({ to: profile.email, ...acknowledgement }, `plan-request-${planRequest.id}`).catch(() => ({ sent: false as const, reason: "provider_error" as const }));
  return Response.json({ ok: true, requestId: planRequest.id, acknowledgementSent: delivery.sent, mailto: `mailto:findnext@ignyxx.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` });
}
