"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLAN_PRICES, PLANS, type PaidPlan, type BillingCycle } from "@/lib/plans";

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

export function PaymentCheckout({ plan, cycle, email, test, disabled, onBusy, onActivated }: {
  plan: PaidPlan; cycle: BillingCycle; email: string; test: boolean; disabled: boolean;
  onBusy: (busy: boolean) => void; onActivated: () => Promise<void>;
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
      // A dashboard refresh failure must not relabel a verified payment as pending.
      await onActivated().catch(() => {
        setMessage(result.test ? "Test payment verified. No real plan was activated. Refresh to reload your dashboard." : `Your ${selected.name} plan is active. Refresh to reload your expiry and allowances.`);
      });
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
      const response = await fetch("/api/payments/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, billingCycle: cycle, purchaseId: purchaseId.current }), signal: AbortSignal.timeout(25000) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "Checkout is unavailable. Please try later.");
      if (!window.Razorpay || order.test !== test || order.amount !== PLAN_PRICES[plan][cycle] * 100 || order.currency !== "INR") throw new Error("Order details changed. Please refresh before paying.");
      const checkout = new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: "VXL", description: `${selected.name} · ${cycle === "annual" ? "365 days" : "28 days"} · No automatic renewal`,
        prefill: { email }, theme: { color: "#09090b" },
        handler: payment => { void verify(payment); },
        modal: { ondismiss: () => { if (!callbackStarted.current) { setState("idle"); setMessage("Checkout closed. If money was debited, check your plan or contact support before retrying."); release(); } } },
      });
      checkout.on("payment.failed", () => setMessage("This payment attempt failed. You can retry inside checkout. If money was debited, check with support before paying again."));
      setState("checkout"); checkout.open();
    } catch (error) {
      setState("idle"); setMessage(error instanceof Error ? error.message : "Checkout is unavailable."); release();
    }
  }

  return <div className="mt-6 min-w-0">
    {!expanded ? <Button className="w-full" disabled={disabled} onClick={() => setExpanded(true)}>{test ? "Test checkout" : `Choose ${selected.name}`}</Button> :
      <section aria-label={`${selected.name} order summary`} className="rounded-xl border border-slate-300 p-4">
        <h3 className="font-semibold">{test ? "Test order" : "Your order"}: VXL {selected.name}</h3>
        <p className="mt-2 text-xl font-semibold">₹{PLAN_PRICES[plan][cycle].toLocaleString("en-IN")}</p>
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
