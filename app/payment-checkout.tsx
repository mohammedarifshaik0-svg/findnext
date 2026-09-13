"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLAN_PRICES, PLANS, type PaidPlan, type BillingCycle } from "@/lib/plans";
import { planItem, trackConfirmedPurchase, trackEvent, trackRecommendedEvent, trackTransactionEvent } from "@/lib/analytics";

type PaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string; order_id: string; amount: number; currency: string; name: string;
  description: string; prefill: { email: string }; theme: { color: string };
  handler: (payment: PaymentResponse) => void;
  modal: { ondismiss: () => void };
};
declare global {
  interface Window { Razorpay?: new (options: CheckoutOptions) => { open: () => void; on: (event: string, callback: () => void) => void } }
}
let scriptPromise: Promise<void> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => { window.clearTimeout(timeout); script.remove(); scriptPromise = null; reject(new Error("Secure checkout could not load. Please check your connection and retry.")); };
    script.onerror = fail;
    script.onload = () => { window.clearTimeout(timeout); if (window.Razorpay) resolve(); else fail(); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function PaymentCheckout({ plan, cycle, email, referralCode, test, disabled, onBusy, onActivated }: {
  plan: PaidPlan; cycle: BillingCycle; email: string; referralCode: string; test: boolean; disabled: boolean;
  onBusy: (busy: boolean) => void; onActivated: (plan: PaidPlan) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "opening" | "checkout" | "verifying" | "pending" | "complete">("idle");
  const busyRef = useRef(false);
  const purchaseId = useRef<string | null>(null);
  const paymentRef = useRef<PaymentResponse | null>(null);
  const callbackStarted = useRef(false);
  const selected = PLANS.find(item => item.id === plan)!;
  const busy = ["opening", "checkout", "verifying"].includes(state);
  const baseAmount = PLAN_PRICES[plan][cycle] * 100;
  const referralAmount = Math.round(baseAmount * 0.9);
  const hasReferral = Boolean(referralCode.trim());
  const release = () => { busyRef.current = false; onBusy(false); };

  async function verify(payment: PaymentResponse) {
    callbackStarted.current = true;
    paymentRef.current = payment;
    setState("verifying");
    setMessage("Verifying your payment. Please do not pay again.");
    try {
      const response = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment), signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok || result.status !== "captured") throw new Error("Verification is pending. Check again before making another payment.");
      setState("complete");
      setMessage(result.test ? "Test payment verified. No real plan was activated and no real money was charged." : `Your ${selected.name} plan is active. View your expiry and allowances above.`);
      let activationConfirmed = true;
      if (!result.test && result.transactionId && result.plan === plan && result.currency === "INR" && typeof result.amountPaise === "number") {
        const value = result.amountPaise / 100;
        const parameters = { transaction_id: String(result.transactionId), plan_name: plan, payment_provider: "razorpay" as const, currency: "INR" as const, value, items: [planItem(plan, cycle, value)] };
        trackConfirmedPurchase(parameters);
        activationConfirmed = await onActivated(plan).catch(() => false);
        if (activationConfirmed) trackTransactionEvent(String(result.transactionId), "plan_activated", { plan_name: plan, source: "razorpay_confirmation", payment_provider: "razorpay" });
      } else {
        activationConfirmed = await onActivated(plan).catch(() => false);
      }
      // A dashboard refresh failure must not relabel a verified payment as pending.
      if (!activationConfirmed) setMessage(result.test ? "Test payment verified. No real plan was activated. Refresh to reload your dashboard." : `Payment verified. Refresh to reload your ${selected.name} plan and expiry.`);
    } catch {
      setState("pending");
      setMessage("We could not confirm payment yet. Do not pay again. Check payment status or contact payments@thevxl.com.");
    } finally { release(); }
  }

  async function pay() {
    if (busyRef.current || disabled) return;
    busyRef.current = true; onBusy(true); setState("opening"); setMessage("Preparing secure checkout…");
    callbackStarted.current = false;
    try {
      await loadCheckout();
      purchaseId.current ??= crypto.randomUUID();
      const response = await fetch("/api/payments/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, billingCycle: cycle, purchaseId: purchaseId.current, referralCode }), signal: AbortSignal.timeout(25000) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "Checkout is unavailable. Please try later.");
      const validAmount = order.amount === baseAmount || order.amount === referralAmount;
      const expectedDiscount = order.amount === referralAmount && referralAmount !== baseAmount;
      if (!window.Razorpay || order.test !== test || !validAmount || order.currency !== "INR" || order.discountApplied !== expectedDiscount) throw new Error("Order details changed. Please refresh before paying.");
      if (!order.test) {
        const value = order.amount / 100;
        trackEvent("checkout_started", { plan_name: plan, source: "plans", payment_provider: "razorpay", currency: "INR", value });
        trackRecommendedEvent("begin_checkout", { plan_name: plan, payment_provider: "razorpay", currency: "INR", value, items: [planItem(plan, cycle, value)] });
      }
      const checkout = new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: "VXL", description: `${selected.name} · ${cycle === "annual" ? "365 days" : "28 days"} · No automatic renewal`,
        prefill: { email }, theme: { color: "#09090b" },
        handler: payment => { void verify(payment); },
        modal: { ondismiss: () => { if (!callbackStarted.current) { setState("idle"); setMessage("Checkout closed. If money was debited, check your plan or contact support before retrying."); release(); } } },
      });
      checkout.on("payment.failed", () => {
        if (!test) trackEvent("payment_failed", { plan_name: plan, source: "razorpay_checkout", payment_provider: "razorpay", currency: "INR", value: (hasReferral ? referralAmount : baseAmount) / 100 });
        setMessage("This payment attempt failed. You can retry inside checkout. If money was debited, check with support before paying again.");
      });
      setState("checkout"); checkout.open();
    } catch (error) {
      setState("idle"); setMessage(error instanceof Error ? error.message : "Checkout is unavailable."); release();
    }
  }

  return <div className="mt-6 min-w-0">
    {!expanded ? <Button className="w-full" disabled={disabled} onClick={() => {
      setExpanded(true);
      if (!test) {
        trackEvent("plan_selected", { plan_name: plan, source: "plans" });
        trackRecommendedEvent("view_item", { plan_name: plan, currency: "INR", value: baseAmount / 100, items: [planItem(plan, cycle, baseAmount / 100)] });
      }
    }}>{test ? "Test checkout" : `Choose ${selected.name}`}</Button> :
      <section aria-label={`${selected.name} order summary`} className="rounded-xl border border-slate-300 p-4">
        <h3 className="font-semibold">{test ? "Test order" : "Your order"}: VXL {selected.name}</h3>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <p className="text-xl font-semibold">₹{((hasReferral ? referralAmount : baseAmount) / 100).toLocaleString("en-IN", { minimumFractionDigits: hasReferral ? 2 : 0, maximumFractionDigits: 2 })}</p>
          {hasReferral && <><span className="text-sm text-slate-400 line-through">₹{(baseAmount / 100).toLocaleString("en-IN")}</span><span className="text-xs font-semibold text-emerald-700">10% referral saving</span></>}
        </div>
        {hasReferral && <p className="mt-1 text-xs text-slate-500">Your code is validated before secure checkout opens.</p>}
        <p className="mt-1 text-sm">{cycle === "annual" ? "365 days" : "28 days"} · One-time payment</p>
        <p className="mt-1 text-sm">No automatic renewal.</p>
        {test && <p className="mt-3 text-sm font-semibold">Sandbox only. This will not upgrade your real account.</p>}
        <p className="mt-3 text-xs leading-5">By purchasing a VXL plan, you agree to our <Link className="underline" href="/terms">Terms &amp; Conditions</Link> and <Link className="underline" href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p>
        {state === "pending" ? <Button className="mt-4 w-full" disabled={disabled || busy} onClick={() => { if (!busyRef.current && paymentRef.current) { busyRef.current = true; onBusy(true); void verify(paymentRef.current); } }}>Check payment status</Button> : state !== "complete" && <Button className="mt-4 w-full" disabled={disabled || busy} onClick={() => void pay()}>{busy ? "Processing…" : test ? "Pay in test mode" : "Pay securely"}</Button>}
        {!busy && state === "idle" && <Button className="mt-2 w-full" variant="ghost" onClick={() => setExpanded(false)}>Back to plans</Button>}
      </section>}
    <p role="status" aria-live="polite" className="mt-3 break-words text-sm leading-6">{message}</p>
  </div>;
}
