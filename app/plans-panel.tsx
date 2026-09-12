"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  CircleCheckBig,
  Copy,
  Crown,
  Gift,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentCheckout } from "@/app/payment-checkout";
import { PLAN_LIMITS, PLAN_PRICES, PLANS, UNIVERSAL_BENEFITS, type BillingCycle, type PaidPlan as Plan } from "@/lib/plans";

type SubscriptionPlan = "trial" | Plan;
type Subscription = {
  plan: SubscriptionPlan;
  status: "active" | "expired" | "cancelled";
  period_starts_at: string | null;
  period_ends_at: string | null;
  updated_at: string;
};
type BillingData = {
  referral?: { code: string };
  attribution?: { referral_code: string; status: string };
  referralStats?: { successful: number; bonusDays: number };
  requests?: Array<{
    id: string;
    plan: Plan;
    billing_cycle: BillingCycle;
    status: string;
    created_at: string;
  }>;
  subscription?: Subscription | null;
  usage?: {
    cycleStartsAt: string;
    cycleEndsAt: string;
    published_updates: number;
    resume_reimports: number;
    ai_improvements: number;
  } | null;
  purchases?: Array<{
    id: string;
    mode: "test" | "live";
    plan: Plan;
    billing_cycle: BillingCycle;
    amount_paise: number;
    currency: "INR";
    status: "creating" | "created" | "failed" | "captured";
    activated_at: string | null;
    period_ends_at: string | null;
    created_at: string;
  }>;
};
type PlanToast = {
  kind: "success" | "error";
  title: string;
  message: string;
};
type UpgradeConfirmation = {
  plan: Plan;
  periodEndsAt: string;
};

const planNames: Record<SubscriptionPlan, string> = {
  trial: "Free trial",
  live: "Live",
  flex: "Flex",
  care: "Care",
};

async function readResponse(response: Response) {
  if ((response.headers.get("content-type") ?? "").includes("application/json")) {
    return response.json();
  }
  await response.text().catch(() => "");
  return { error: "The service temporarily failed. Please try again." };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function remainingDays(value: string) {
  return Math.max(
    0,
    Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000),
  );
}

export function PlansPanel({ email }: { email: string }) {
  const [now] = useState(() => Date.now());
  const [cycle, setCycle] = useState<BillingCycle>("28_days");
  const [checkout, setCheckout] = useState({enabled:false,test:false});
  const [billing, setBilling] = useState<BillingData>({});
  const [referralInput, setReferralInput] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [planToast, setPlanToast] = useState<PlanToast | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradeConfirmation | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/billing", { cache: "no-store" });
    const result = await readResponse(response);
    if (response.ok) setBilling(result);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedReferral = window.localStorage.getItem("vxl_referral") ?? window.localStorage.getItem("findnext_referral");
      if (savedReferral) setReferralInput(savedReferral);
      void load();
      void fetch("/api/payments/orders",{cache:"no-store"}).then(response=>response.json()).then(result=>setCheckout({enabled:result.enabled===true,test:result.test===true})).catch(()=>{});
    });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  useEffect(() => {
    if (!planToast) return;
    const timer = window.setTimeout(() => setPlanToast(null), 9000);
    return () => window.clearTimeout(timer);
  }, [planToast]);

  const activeSubscription = useMemo(() => {
    const subscription = billing.subscription;
    if (
      !subscription ||
      subscription.status !== "active" ||
      !subscription.period_ends_at ||
      new Date(subscription.period_ends_at).getTime() <= now
    ) {
      return null;
    }
    return subscription;
  }, [billing.subscription, now]);

  const requestPlan = async (plan: Plan) => {
    setWorking(plan);
    setPlanToast(null);
    const selectedPlan = PLANS.find((item) => item.id === plan);

    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan,
          billingCycle: cycle,
          referralCode: referralInput,
        }),
      });
      const result = await readResponse(response);
      if (!response.ok || result.acknowledgementSent !== true) {
        throw new Error(
          result.error ||
            "We could not email your plan details. Please try again.",
        );
      }
      setPlanToast({
        kind: "success",
        title: `${selectedPlan?.name ?? "Plan"} request sent`,
        message:
          "Your plan details are on their way. Please check your inbox and spam folder.",
      });
      await load();
    } catch (error) {
      setPlanToast({
        kind: "error",
        title: "Email could not be sent",
        message:
          error instanceof Error ? error.message : "Please try again shortly.",
      });
    } finally {
      setWorking(null);
    }
  };

  const redeem = async () => {
    setWorking("redeem");
    setPlanToast(null);

    try {
      const response = await fetch("/api/billing/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: activationCode }),
      });
      const result = await readResponse(response);
      if (!response.ok) {
        throw new Error(result.error || "Could not redeem this code.");
      }

      const plan = result.redemption.plan as Plan;
      const periodEndsAt = result.redemption.periodEndsAt as string;
      setActivationCode("");
      setUpgrade({ plan, periodEndsAt });
      await load();
    } catch (error) {
      setPlanToast({
        kind: "error",
        title: "Code could not be redeemed",
        message:
          error instanceof Error
            ? error.message
            : "Please check the code and try again.",
      });
    } finally {
      setWorking(null);
    }
  };

  const referralLink = billing.referral?.code
    ? `${typeof window === "undefined" ? "https://thevxl.com" : window.location.origin}/?ref=${billing.referral.code}`
    : "";
  const appliedReferral = billing.attribution?.referral_code ?? "";
  const hasPaidPurchase = billing.purchases?.some((purchase) => purchase.mode === "live" && purchase.status === "captured") ?? false;
  const displayReferral = appliedReferral || referralInput;
  const checkoutReferral = billing.attribution?.status === "pending"
    ? appliedReferral
    : billing.attribution || hasPaidPurchase
      ? ""
      : referralInput;

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(referralLink);
          copied = true;
        } catch {}
      }
      if (!copied) {
        const input = document.createElement("textarea");
        input.value = referralLink;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        copied = document.execCommand("copy");
        input.remove();
      }
      if (!copied) throw new Error("Copy blocked");
      setPlanToast({ kind: "success", title: "Referral link copied", message: "It is ready to share with your circle." });
    } catch {
      setPlanToast({ kind: "error", title: "Copy was blocked", message: "Press and hold the referral link to copy it manually." });
    }
  };

  const usageRows = activeSubscription && activeSubscription.plan !== "trial"
    ? [
        { key: "published_updates" as const, label: "Published updates" },
        { key: "resume_reimports" as const, label: "Résumé re-imports" },
      ]
    : [];

  return (
    <div className="space-y-5">
      {activeSubscription && (
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-[radial-gradient(circle_at_90%_10%,rgba(52,211,153,.22),transparent_35%),linear-gradient(135deg,#052e2b,#064e3b)] p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Crown className="h-5 w-5 text-emerald-300" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-300 text-emerald-950 hover:bg-emerald-300">
                    ACTIVE
                  </Badge>
                  <span className="text-sm font-semibold text-emerald-200">
                    VXL membership
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">
                  Your {planNames[activeSubscription.plan]} plan is live.
                </h2>
                <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                  Your portfolio is covered and your plan benefits are unlocked.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-emerald-300" />
                Valid until {formatDate(activeSubscription.period_ends_at!)}
              </div>
              <p className="mt-1 text-xs text-emerald-100/70">
                {remainingDays(activeSubscription.period_ends_at!)} days remaining
              </p>
            </div>
          </div>
          {usageRows.length > 0 && (
            <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-3">
              {usageRows.map(({ key, label }) => {
                const limit = PLAN_LIMITS[activeSubscription.plan as Plan][key];
                const used = billing.usage?.[key] ?? 0;
                const remaining = limit === null ? null : Math.max(0, limit - used);
                return (
                  <div key={key} className="rounded-xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-white">{label}</span>
                      <span className="text-emerald-200">{limit === null ? "Unlimited" : `${used}/${limit}`}</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-100/70">
                      {remaining === null ? "No usage limit" : `${remaining} remaining this cycle`}
                    </p>
                    {limit !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} /></div>}
                  </div>
                );
              })}
              <p className="text-xs text-emerald-100/70 md:col-span-3">
                Allowances reset {billing.usage?.cycleEndsAt ? formatDate(billing.usage.cycleEndsAt) : "every 28 days"}. Failed imports never use an allowance.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="bg-indigo-50 text-indigo-700">
              Every template included
            </Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-.03em]">
              Keep your story live, your way.
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              No ads. No hidden template charges. Start with a 28-day pass or
              save with annual access.
            </p>
          </div>
          <div className="inline-flex shrink-0 self-start rounded-xl bg-slate-100 p-1" role="group" aria-label="Billing period">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                cycle === "28_days" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setCycle("28_days")}
              disabled={Boolean(working)}
              aria-pressed={cycle === "28_days"}
            >
              Monthly
              <span className="block text-[10px] font-medium opacity-65">28 days</span>
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                cycle === "annual" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setCycle("annual")}
              disabled={Boolean(working)}
              aria-pressed={cycle === "annual"}
            >
              Annual
              <span className="block text-[10px] font-medium opacity-65">Best value</span>
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = activeSubscription?.plan === plan.id;
            return (
              <article
                key={plan.id}
                className={`vxl-plan-card relative rounded-2xl border p-5 ${
                  isCurrent
                    ? "border-emerald-300 bg-emerald-50/50"
                    : plan.featured
                      ? "border-indigo-300 bg-indigo-50/40"
                      : "border-slate-200"
                }`}
              >
                {isCurrent ? (
                  <Badge className="absolute right-4 top-4 bg-emerald-600">
                    Current plan
                  </Badge>
                ) : (
                  plan.featured && (
                    <Badge className="absolute right-4 top-4 bg-indigo-600">
                      Most flexible
                    </Badge>
                  )
                )}
                <p className="text-sm font-bold uppercase tracking-[.14em] text-slate-500">
                  {plan.name}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-semibold tracking-[-.05em]">
                    ₹{PLAN_PRICES[plan.id][cycle]}
                  </span>
                  <span className="text-sm text-slate-500">
                    /{cycle === "annual" ? "year" : "28 days"}
                  </span>
                </div>
                <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">
                  {plan.description}
                </p>
                <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600"><strong>Best for:</strong> {plan.bestFor}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className={`flex gap-2 text-sm ${feature.comingSoon ? "text-indigo-800" : feature.included ? "text-slate-800" : "text-slate-400"}`}>
                      {feature.comingSoon ? <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /> : feature.included ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}
                      <span><strong className="font-medium">{feature.label}{feature.comingSoon && <Badge variant="outline" className="ml-2 border-indigo-200 bg-indigo-50 text-[9px] text-indigo-700">Coming soon</Badge>}</strong><span className="block text-xs leading-5 opacity-80">{feature.detail}</span></span>
                    </li>
                  ))}
                </ul>
                {checkout.enabled ? <PaymentCheckout key={`${plan.id}-${cycle}-${checkoutReferral}`} plan={plan.id} cycle={cycle} email={email} referralCode={checkoutReferral} test={checkout.test} disabled={Boolean(working)} onBusy={busy=>setWorking(busy?plan.id:null)} onActivated={load} /> : <Button
                  className="mt-6 w-full"
                  variant={plan.featured && !isCurrent ? "default" : "outline"}
                  disabled={Boolean(working) || isCurrent}
                  onClick={() => requestPlan(plan.id)}
                >
                  {working === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {isCurrent ? "Active now" : `Request ${plan.name}`}
                </Button>}
              </article>
            );
          })}
        </div>

        {!checkout.enabled && <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Included with every paid plan</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {UNIVERSAL_BENEFITS.map((benefit) => <div key={benefit} className="flex gap-2 text-sm text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{benefit}</div>)}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Limits apply only to the actions listed above. You can always edit and save drafts; on Live, publishing a saved draft uses one published update.</p>
        </div>}

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="field">
            <span>{billing.attribution?.status === "rewarded" ? "Referral saving used on your first paid term." : hasPaidPurchase && !appliedReferral ? "Referral codes apply before your first paid term." : "Have a referral code? Get 10% off your first paid term."}</span>
            <Input
              value={displayReferral}
              onChange={(event) =>
                setReferralInput(event.target.value.toUpperCase())
              }
              disabled={Boolean(appliedReferral) || hasPaidPurchase}
              placeholder="VXL-XXXXXXXX"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            {appliedReferral ? `${appliedReferral} is attached to your account and will be checked automatically.` : hasPaidPurchase ? "Your account already has a verified paid purchase." : "A valid code is checked before Razorpay opens and reduces the displayed checkout total by 10%."}
          </p>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">By purchasing a VXL plan, you agree to our <Link className="font-semibold underline underline-offset-4" href="/terms">Terms &amp; Conditions</Link> and <Link className="font-semibold underline underline-offset-4" href="/refund-policy">Refund &amp; Cancellation Policy</Link>. These are fixed-duration plans and do not renew automatically.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">Your referral circle</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Your friend saves 10% on their first paid term. After that payment is verified, you receive 30 bonus days—added to your active paid plan, or 30 days of Live if you do not have one.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1.5">{billing.referralStats?.successful ?? 0} successful referrals</span><span className="rounded-full bg-slate-100 px-3 py-1.5">{billing.referralStats?.bonusDays ?? 0} bonus days earned</span></div>
          <div className="mt-4 flex gap-2">
            <Input
              readOnly
              value={billing.referral?.code ?? "Creating your code…"}
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!referralLink}
              onClick={() => void copyReferralLink()}
              aria-label="Copy referral link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {billing.attribution && (
            <p className="mt-3 text-xs text-emerald-700">
              Applied referral: {billing.attribution.referral_code}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">{checkout.enabled ? "Promo or complimentary code" : "Activate after payment"}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {checkout.enabled ? "Payment purchases activate automatically. Enter a private code here only when VXL support provides one." : "We email a private, single-use activation code after verifying payment."}
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              value={activationCode}
              onChange={(event) =>
                setActivationCode(event.target.value.toUpperCase())
              }
              placeholder="Activation code"
            />
            <Button
              onClick={redeem}
              disabled={!activationCode || Boolean(working)}
            >
              {working === "redeem" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Redeem"
              )}
            </Button>
          </div>
        </section>
      </div>

      {billing.purchases && billing.purchases.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="font-semibold">Payment history</h3>
        <p className="mt-1 text-sm text-slate-500">Razorpay payments and their verified VXL status. Test payments never activate a real plan.</p>
        <div className="mt-4 divide-y divide-slate-100">
          {billing.purchases.map((purchase) => <div key={purchase.id} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold">{planNames[purchase.plan]} · {purchase.billing_cycle === "annual" ? "1 year" : "28 days"}</p><p className="mt-1 text-xs text-slate-500">{formatDate(purchase.created_at)} · {purchase.mode === "test" ? "Test payment" : "Razorpay payment"}</p></div>
            <div className="sm:text-right"><p className="text-sm font-semibold">₹{(purchase.amount_paise / 100).toLocaleString("en-IN")}</p><p className={`mt-1 text-xs font-semibold ${purchase.status === "captured" ? "text-emerald-700" : purchase.status === "failed" ? "text-red-600" : "text-amber-700"}`}>{purchase.status === "captured" ? purchase.mode === "test" ? "Test verified" : "Plan activated" : purchase.status === "failed" ? "Failed" : "Pending"}</p></div>
          </div>)}
        </div>
      </section>}

      <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
          <div>
            <p className="font-semibold">You’re in our circle.</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Your story stays yours. Private until you publish, free of ads,
              and supported by a real person.
            </p>
            <a
              className="mt-3 inline-block text-sm font-semibold text-indigo-300"
              href={`mailto:hello@thevxl.com?subject=${encodeURIComponent(
                `VXL support for ${email}`,
              )}`}
            >
              hello@thevxl.com
            </a>
          </div>
        </div>
      </section>

      {planToast && (
        <div
          role={planToast.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex w-[min(390px,calc(100vw-2.5rem))] items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
            planToast.kind === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
              : "border-rose-200 bg-rose-50/95 text-rose-950"
          }`}
        >
          {planToast.kind === "success" ? (
            <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{planToast.title}</p>
            <p className="mt-1 text-sm leading-5 opacity-80">
              {planToast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlanToast(null)}
            className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {upgrade && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-title"
        >
          <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-emerald-300/30 bg-slate-950 text-white shadow-2xl">
            <div className="bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,.3),transparent_48%)] px-7 pb-8 pt-10 text-center sm:px-10">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/25">
                <Crown className="h-8 w-8" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[.22em] text-emerald-300">
                Upgrade confirmed
              </p>
              <h2
                id="upgrade-title"
                className="mt-2 text-3xl font-semibold tracking-[-.04em]"
              >
                You’re officially {planNames[upgrade.plan]}.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-300">
                Your payment code was accepted, your benefits are unlocked, and
                your portfolio can stay live until {formatDate(upgrade.periodEndsAt)}.
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                  <CircleCheckBig className="h-4 w-4" />
                  Plan active
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {remainingDays(upgrade.periodEndsAt)} days of access remaining
                </p>
              </div>
              <Button
                className="mt-6 w-full bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                onClick={() => setUpgrade(null)}
              >
                Continue with {planNames[upgrade.plan]}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
