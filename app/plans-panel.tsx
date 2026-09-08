"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type BillingCycle = "28_days" | "annual";
type Plan = "live" | "flex" | "care";
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
  requests?: Array<{
    id: string;
    plan: Plan;
    billing_cycle: BillingCycle;
    status: string;
    created_at: string;
  }>;
  subscription?: Subscription | null;
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

const plans: Array<{
  id: Plan;
  name: string;
  prices: Record<BillingCycle, number>;
  description: string;
  features: string[];
  featured?: boolean;
}> = [
  {
    id: "live",
    name: "Live",
    prices: { "28_days": 50, annual: 499 },
    description: "A polished portfolio that stays online.",
    features: [
      "Secure portfolio hosting",
      "Every template included",
      "Custom FindNext address",
    ],
  },
  {
    id: "flex",
    name: "Flex",
    prices: { "28_days": 100, annual: 999 },
    description: "For people who keep their story moving.",
    features: [
      "Everything in Live",
      "Unlimited self-updates",
      "Saved revision history",
    ],
    featured: true,
  },
  {
    id: "care",
    name: "Care",
    prices: { "28_days": 250, annual: 2499 },
    description: "Hands-on help when you want us beside you.",
    features: [
      "Everything in Flex",
      "Managed update requests",
      "Custom-domain assistance",
    ],
  },
];

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
  const [cycle, setCycle] = useState<BillingCycle>("28_days");
  const [billing, setBilling] = useState<BillingData>({});
  const [referralInput, setReferralInput] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [notice, setNotice] = useState("");
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
      const savedReferral = window.localStorage.getItem("findnext_referral");
      if (savedReferral) setReferralInput(savedReferral);
      void load();
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
      new Date(subscription.period_ends_at).getTime() <= Date.now()
    ) {
      return null;
    }
    return subscription;
  }, [billing.subscription]);

  const requestPlan = async (plan: Plan) => {
    setWorking(plan);
    setNotice("");
    setPlanToast(null);
    const selectedPlan = plans.find((item) => item.id === plan);

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
    setNotice("");
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
      setNotice(
        `Your ${planNames[plan]} plan is active until ${formatDate(periodEndsAt)}.`,
      );
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
    ? `https://findnext.vercel.app/?ref=${billing.referral.code}`
    : "";

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
                    FindNext membership
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
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                cycle === "28_days" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setCycle("28_days")}
            >
              28 days
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                cycle === "annual" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setCycle("annual")}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = activeSubscription?.plan === plan.id;
            return (
              <article
                key={plan.id}
                className={`relative rounded-2xl border p-5 ${
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
                    ₹{plan.prices[cycle]}
                  </span>
                  <span className="text-sm text-slate-500">
                    /{cycle === "annual" ? "year" : "28 days"}
                  </span>
                </div>
                <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">
                  {plan.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
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
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="field">
            <span>Have a referral code? Get 10% off your first paid term.</span>
            <Input
              value={referralInput}
              onChange={(event) =>
                setReferralInput(event.target.value.toUpperCase())
              }
              placeholder="FN-XXXXXXXX"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            We confirm your discounted payment total by email before you pay.
          </p>
        </div>
      </section>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          <CircleCheckBig className="h-4 w-4 shrink-0 text-emerald-600" />
          {notice}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">Your referral circle</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your friend saves 10% on their first paid term. You receive 30 extra
            live days after their payment is verified.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              readOnly
              value={billing.referral?.code ?? "Creating your code…"}
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!referralLink}
              onClick={() => {
                void navigator.clipboard.writeText(referralLink);
                setNotice("Referral link copied.");
              }}
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
            <h3 className="font-semibold">Activate after payment</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            We email a private, single-use activation code after verifying
            payment.
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
              href={`mailto:findnext@ignyxx.in?subject=${encodeURIComponent(
                `FindNext support for ${email}`,
              )}`}
            >
              findnext@ignyxx.in
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
