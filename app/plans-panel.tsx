"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift, Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BillingCycle = "28_days" | "annual";
type Plan = "live" | "flex" | "care";
type BillingData = { referral?: { code: string }; attribution?: { referral_code: string; status: string }; requests?: Array<{ id: string; plan: Plan; billing_cycle: BillingCycle; status: string; created_at: string }> };

const plans: Array<{ id: Plan; name: string; prices: Record<BillingCycle, number>; description: string; features: string[]; featured?: boolean }> = [
  { id: "live", name: "Live", prices: { "28_days": 50, annual: 499 }, description: "A polished portfolio that stays online.", features: ["Secure portfolio hosting", "Every template included", "Custom FindNext address"] },
  { id: "flex", name: "Flex", prices: { "28_days": 100, annual: 999 }, description: "For people who keep their story moving.", features: ["Everything in Live", "Unlimited self-updates", "Saved revision history"], featured: true },
  { id: "care", name: "Care", prices: { "28_days": 250, annual: 2499 }, description: "Hands-on help when you want us beside you.", features: ["Everything in Flex", "Managed update requests", "Custom-domain assistance"] },
];

async function readResponse(response: Response) {
  if ((response.headers.get("content-type") ?? "").includes("application/json")) return response.json();
  await response.text().catch(() => "");
  return { error: "The service temporarily failed. Please try again." };
}

export function PlansPanel({ email }: { email: string }) {
  const [cycle, setCycle] = useState<BillingCycle>("28_days");
  const [billing, setBilling] = useState<BillingData>({});
  const [referralInput, setReferralInput] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/billing");
    const result = await readResponse(response);
    if (response.ok) setBilling(result);
  };
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedReferral = window.localStorage.getItem("findnext_referral");
      if (savedReferral) setReferralInput(savedReferral);
      void load();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const requestPlan = async (plan: Plan) => {
    setWorking(plan); setNotice("");
    try {
      const response = await fetch("/api/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, billingCycle: cycle, referralCode: referralInput }) });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "Could not create the plan request.");
      setNotice(result.acknowledgementSent ? "Request saved. We emailed you a confirmation; your email app is opening so you can reply to support." : "Request saved. Your email app is opening with the request details for support.");
      await load();
      window.location.assign(result.mailto);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not request the plan."); }
    finally { setWorking(null); }
  };

  const redeem = async () => {
    setWorking("redeem"); setNotice("");
    try {
      const response = await fetch("/api/billing/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: activationCode }) });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "Could not redeem this code.");
      setNotice(`Your ${result.redemption.plan} plan is active. Your portfolio can stay live until ${new Date(result.redemption.periodEndsAt).toLocaleDateString()}.`);
      setActivationCode("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not redeem this code."); }
    finally { setWorking(null); }
  };

  const referralLink = billing.referral?.code ? `https://findnext.vercel.app/?ref=${billing.referral.code}` : "";
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="bg-indigo-50 text-indigo-700">Every template included</Badge><h2 className="mt-3 text-2xl font-semibold tracking-[-.03em]">Keep your story live, your way.</h2><p className="mt-2 text-sm text-slate-500">No ads. No hidden template charges. Start with a 28-day pass or save with annual access.</p></div><div className="inline-flex rounded-xl bg-slate-100 p-1"><button className={`rounded-lg px-4 py-2 text-sm font-semibold ${cycle === "28_days" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setCycle("28_days")}>28 days</button><button className={`rounded-lg px-4 py-2 text-sm font-semibold ${cycle === "annual" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setCycle("annual")}>Annual</button></div></div>
      <div className="mt-7 grid gap-4 lg:grid-cols-3">{plans.map((plan) => <article key={plan.id} className={`relative rounded-2xl border p-5 ${plan.featured ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"}`}>{plan.featured && <Badge className="absolute right-4 top-4 bg-indigo-600">Most flexible</Badge>}<p className="text-sm font-bold uppercase tracking-[.14em] text-slate-500">{plan.name}</p><div className="mt-4"><span className="text-4xl font-semibold tracking-[-.05em]">₹{plan.prices[cycle]}</span><span className="text-sm text-slate-500">/{cycle === "annual" ? "year" : "28 days"}</span></div><p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{plan.description}</p><ul className="mt-5 space-y-2">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />{feature}</li>)}</ul><Button className="mt-6 w-full" variant={plan.featured ? "default" : "outline"} disabled={Boolean(working)} onClick={() => requestPlan(plan.id)}>{working === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Request {plan.name}</Button></article>)}</div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><label className="field"><span>Have a referral code? Get 10% off your first paid term.</span><Input value={referralInput} onChange={(event) => setReferralInput(event.target.value.toUpperCase())} placeholder="FN-XXXXXXXX" /></label><p className="mt-2 text-xs text-slate-500">We confirm your discounted payment total by email before you pay.</p></div>
    </section>

    {notice && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{notice}</div>}

    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Gift className="h-5 w-5 text-indigo-600" /><h3 className="font-semibold">Your referral circle</h3></div><p className="mt-2 text-sm leading-6 text-slate-500">Your friend saves 10% on their first paid term. You receive 30 extra live days after their payment is verified.</p><div className="mt-4 flex gap-2"><Input readOnly value={billing.referral?.code ?? "Creating your code…"} /><Button variant="outline" size="icon" disabled={!referralLink} onClick={() => { void navigator.clipboard.writeText(referralLink); setNotice("Referral link copied."); }} aria-label="Copy referral link"><Copy className="h-4 w-4" /></Button></div>{billing.attribution && <p className="mt-3 text-xs text-emerald-700">Applied referral: {billing.attribution.referral_code}</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-600" /><h3 className="font-semibold">Activate after payment</h3></div><p className="mt-2 text-sm leading-6 text-slate-500">We email a private, single-use activation code after verifying payment.</p><div className="mt-4 flex gap-2"><Input value={activationCode} onChange={(event) => setActivationCode(event.target.value.toUpperCase())} placeholder="Activation code" /><Button onClick={redeem} disabled={!activationCode || Boolean(working)}>{working === "redeem" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}</Button></div></section></div>

    <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" /><div><p className="font-semibold">You’re in our circle.</p><p className="mt-1 text-sm leading-6 text-slate-300">Your story stays yours. Private until you publish, free of ads, and supported by a real person.</p><a className="mt-3 inline-block text-sm font-semibold text-indigo-300" href={`mailto:findnext@ignyxx.in?subject=${encodeURIComponent(`FindNext support for ${email}`)}`}>findnext@ignyxx.in</a></div></div></section>
  </div>;
}
