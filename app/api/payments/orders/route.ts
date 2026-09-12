import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_PRICES, type PaidPlan, type BillingCycle } from "@/lib/plans";
import { razorpayConfig, razorpayRequest } from "@/lib/razorpay";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const { mode } = razorpayConfig();
    return Response.json({ enabled: mode === "test" || process.env.RAZORPAY_CHECKOUT_ENABLED === "true", test: mode === "test" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ enabled: false, test: false }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const limited = await checkRateLimit(user.id, "payment_order");
  if (limited) return limited;
  const raw = await request.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });
  let body: { plan?: string; billingCycle?: string; purchaseId?: string; referralCode?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!["live", "flex", "care"].includes(body.plan ?? "") || !["28_days", "annual"].includes(body.billingCycle ?? "") || typeof body.purchaseId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.purchaseId)) {
    return Response.json({ error: "Choose a valid plan and billing period." }, { status: 400 });
  }

  try {
    const { mode, keyId } = razorpayConfig();
    if (mode === "live" && process.env.RAZORPAY_CHECKOUT_ENABLED !== "true") {
      return Response.json({ error: "Online checkout is being prepared. Please contact payments@thevxl.com." }, { status: 503 });
    }
    const admin = createAdminClient();
    const plan = body.plan as PaidPlan;
    const cycle = body.billingCycle as BillingCycle;
    const baseAmount = PLAN_PRICES[plan][cycle] * 100;
    const requestedCode = body.referralCode?.trim().toUpperCase() ?? "";

    const { data: existingAttribution, error: attributionError } = await admin
      .from("referral_attributions")
      .select("referral_code,status")
      .eq("referred_profile_id", user.id)
      .maybeSingle();
    if (attributionError) throw new Error("referral_read_failed");
    let attribution = existingAttribution;

    if (requestedCode && (!attribution || attribution.referral_code !== requestedCode)) {
      if (attribution) return Response.json({ error: "Referral " + attribution.referral_code + " is already attached to your account." }, { status: 409 });
      const [paidPurchaseResult, approvedRequestResult, referralResult] = await Promise.all([
        admin.from("payment_purchases").select("id").eq("profile_id", user.id).eq("mode", "live").eq("status", "captured").limit(1).maybeSingle(),
        admin.from("plan_requests").select("id").eq("profile_id", user.id).eq("status", "approved").limit(1).maybeSingle(),
        admin.from("referral_codes").select("profile_id,code").eq("code", requestedCode).eq("is_active", true).maybeSingle(),
      ]);
      if (paidPurchaseResult.error || approvedRequestResult.error || referralResult.error) throw new Error("referral_validation_failed");
      const paidPurchase = paidPurchaseResult.data;
      const approvedRequest = approvedRequestResult.data;
      const referral = referralResult.data;
      if (paidPurchase || approvedRequest) return Response.json({ error: "Referral savings apply only before your first paid term." }, { status: 400 });
      if (!referral) return Response.json({ error: "That referral code is not valid." }, { status: 400 });
      if (referral.profile_id === user.id) return Response.json({ error: "You cannot use your own referral code." }, { status: 400 });
      if (mode === "live") {
        const created = await admin.from("referral_attributions").insert({ referred_profile_id: user.id, referrer_profile_id: referral.profile_id, referral_code: referral.code }).select("referral_code,status").single();
        if (created.error) throw new Error("referral_save_failed");
        attribution = created.data;
      } else {
        attribution = { referral_code: referral.code, status: "pending" };
      }
    }

    const discountApplied = attribution?.status === "pending";
    const amount = discountApplied ? Math.round(baseAmount * 0.9) : baseAmount;
    const previous = await admin.from("payment_purchases").select("*").eq("id", body.purchaseId).eq("profile_id", user.id).maybeSingle();
    if (previous.error) throw new Error("purchase_read_failed");
    if (previous.data) {
      const purchase = previous.data;
      if (purchase.mode !== mode || purchase.plan !== plan || purchase.billing_cycle !== cycle) return new Response(null, { status: 409 });
      if (purchase.razorpay_order_id && purchase.status !== "captured") {
        return Response.json({ keyId, orderId: purchase.razorpay_order_id, amount: purchase.amount_paise, baseAmount, discountApplied: purchase.amount_paise < baseAmount, referralCode: attribution?.referral_code ?? "", currency: purchase.currency, purchaseId: purchase.id, test: mode === "test" });
      }
      return Response.json({ error: "This purchase is already being processed. Check your plan before retrying." }, { status: 409 });
    }

    const inserted = await admin.from("payment_purchases").insert({ id: body.purchaseId, profile_id: user.id, mode, plan, billing_cycle: cycle, amount_paise: amount });
    if (inserted.error) return Response.json({ error: "Purchase already started. Please check its status." }, { status: 409 });
    const order = await razorpayRequest("orders", {
      amount,
      currency: "INR",
      receipt: body.purchaseId,
      notes: {
        vxl_purchase_id: body.purchaseId,
        vxl_user_id: user.id,
        vxl_plan: plan,
        vxl_billing_cycle: cycle,
        vxl_referral_code: attribution?.referral_code ?? "",
      },
    });
    if (typeof order.id !== "string" || !/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount !== amount || order.currency !== "INR") throw new Error("order_mismatch");
    const saved = await admin.from("payment_purchases").update({ razorpay_order_id: order.id, status: "created" }).eq("id", body.purchaseId);
    if (saved.error) throw new Error("order_save_failed");
    return Response.json({ keyId, orderId: order.id, amount, baseAmount, discountApplied, referralCode: attribution?.referral_code ?? "", currency: "INR", purchaseId: body.purchaseId, test: mode === "test" });
  } catch (error) {
    console.error("[vxl-payments] order_creation_failed", { category: error instanceof Error ? error.message : "unknown" });
    return Response.json({ error: "Checkout is temporarily unavailable. No payment was initiated. Please try later." }, { status: 503 });
  }
}
