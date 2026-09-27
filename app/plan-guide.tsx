"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, GitCompareArrows, HelpCircle, Sparkles, UserRoundCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHASE_2_SHOWCASES_ENABLED } from "@/lib/phase2-showcases";
import { ADVANCED_ENGAGEMENT_ANALYTICS_ENABLED } from "@/lib/portfolio-engagement";
import { CUSTOM_DOMAINS_ENABLED } from "@/lib/custom-domains";
import { CARE_SUPPORT_ENABLED } from "@/lib/care-support";
import { PLAN_GUIDE_ENABLED, planComparisonRows, recommendationReason, recommendPlan, type PlanGuideAnswers } from "@/lib/plan-guide";
import type { PaidPlan } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";

type GuideView = "questions" | "comparison";

const initialAnswers: PlanGuideAnswers = { frequency: null, proof: null, humanHelp: null };
const planCopy: Record<PaidPlan, { name: string; line: string; tone: string }> = {
  live: { name: "Live", line: "Get online.", tone: "is-live" },
  flex: { name: "Flex", line: "Make it yours.", tone: "is-flex" },
  care: { name: "Care", line: "Let us help.", tone: "is-care" },
};

export function PlanGuide({ onSelectPlan }: { onSelectPlan?: (plan: PaidPlan) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<GuideView>("questions");
  const [answers, setAnswers] = useState<PlanGuideAnswers>(initialAnswers);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const recommendation = recommendPlan(answers);
  const rows = useMemo(() => planComparisonRows({ core: PHASE_2_SHOWCASES_ENABLED, analytics: ADVANCED_ENGAGEMENT_ANALYTICS_ENABLED, domains: CUSTOM_DOMAINS_ENABLED, support: CARE_SUPPORT_ENABLED }), []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!PLAN_GUIDE_ENABLED) return null;

  const show = (nextView: GuideView) => {
    setView(nextView);
    setOpen(true);
    trackEvent("plan_guide_opened", { feature_name: nextView, source: "pricing" });
  };
  const choose = (plan: PaidPlan) => {
    trackEvent("plan_guide_recommendation_selected", { plan_name: plan, source: "plan_guide" });
    setOpen(false);
    onSelectPlan?.(plan);
  };

  return <>
    <section className="vxl-plan-assist" aria-label="Plan selection help">
      <div><HelpCircle /><span><strong>Not sure which plan fits you?</strong><small>Three quick answers. One transparent recommendation.</small></span></div>
      <div><Button type="button" onClick={() => show("questions")}>Help me choose <ArrowRight /></Button><Button type="button" variant="outline" onClick={() => show("comparison")}><GitCompareArrows />Compare all features</Button></div>
    </section>
    {open && <div className="vxl-plan-guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} className="vxl-plan-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-guide-title">
        <header><div><span>VXL PLAN GUIDE</span><h2 id="plan-guide-title">{view === "questions" ? "Find your fit without the sales theatre." : "Compare every plan clearly."}</h2><p>{view === "questions" ? "Your answers stay in this browser and are used only for this recommendation." : "All plans are fixed-duration access. No automatic renewal."}</p></div><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close plan guide"><X /></button></header>
        <nav aria-label="Plan guide views"><button type="button" className={view === "questions" ? "active" : ""} onClick={() => setView("questions")}><Sparkles />Help me choose</button><button type="button" className={view === "comparison" ? "active" : ""} onClick={() => setView("comparison")}><GitCompareArrows />Full comparison</button></nav>
        {view === "questions" ? <div className="vxl-plan-questions">
          <Question number="1" title="How often will you update your portfolio?" detail="Think about applications, new projects and career changes."><Choice selected={answers.frequency === "occasionally"} onClick={() => setAnswers((current) => ({ ...current, frequency: "occasionally" }))}>Occasionally</Choice><Choice selected={answers.frequency === "frequently"} onClick={() => setAnswers((current) => ({ ...current, frequency: "frequently" }))}>Frequently</Choice></Question>
          <Question number="2" title="Do you want custom sections, screenshots or deeper case studies?" detail="These features help visitors inspect the work behind your claims."><Choice selected={answers.proof === "yes"} onClick={() => setAnswers((current) => ({ ...current, proof: "yes" }))}>Yes</Choice><Choice selected={answers.proof === "no"} onClick={() => setAnswers((current) => ({ ...current, proof: "no" }))}>No</Choice></Question>
          <Question number="3" title="Would you like a human to help maintain your portfolio?" detail="Care includes priority help and one managed update per access cycle."><Choice selected={answers.humanHelp === "yes"} onClick={() => setAnswers((current) => ({ ...current, humanHelp: "yes" }))}>Yes</Choice><Choice selected={answers.humanHelp === "no"} onClick={() => setAnswers((current) => ({ ...current, humanHelp: "no" }))}>No</Choice></Question>
          {recommendation ? <article className={`vxl-plan-recommendation ${planCopy[recommendation].tone}`}><div><UserRoundCheck /><span><small>YOUR BEST FIT</small><strong>{planCopy[recommendation].name} — {planCopy[recommendation].line}</strong></span></div><p>{recommendationReason(recommendation, answers)}</p><div><Button type="button" onClick={() => choose(recommendation)}>Choose {planCopy[recommendation].name} <ArrowRight /></Button><Button type="button" variant="ghost" onClick={() => setView("comparison")}>Compare before deciding</Button></div></article> : <div className="vxl-plan-guide-waiting"><Sparkles /><span><strong>Answer all three questions</strong><small>Your recommendation and the reason behind it will appear here.</small></span></div>}
        </div> : <div className="vxl-plan-comparison"><div className="vxl-plan-comparison-table"><div className="vxl-plan-comparison-head"><strong>Feature</strong><strong>Live</strong><strong>Flex ★</strong><strong>Care</strong></div>{rows.map((row) => <div key={row.feature}><strong>{row.feature}</strong><Cell value={row.live} /><Cell value={row.flex} /><Cell value={row.care} /></div>)}</div><div className="vxl-plan-comparison-actions"><Button variant="outline" type="button" onClick={() => setView("questions")}><ChevronLeft />Help me choose</Button><div>{(["live", "flex", "care"] as const).map((plan) => <Button key={plan} type="button" variant={plan === "flex" ? "default" : "outline"} onClick={() => choose(plan)}>Choose {planCopy[plan].name}</Button>)}</div></div></div>}
      </section>
    </div>}
  </>;
}

function Question({ number, title, detail, children }: { number: string; title: string; detail: string; children: React.ReactNode }) {
  const titleId = `vxl-plan-question-${number}`;
  return <section role="group" aria-labelledby={titleId}><div className="vxl-plan-question-copy"><b>{number}</b><span><strong id={titleId}>{title}</strong><small>{detail}</small></span></div><div>{children}</div></section>;
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={selected ? "active" : ""} aria-pressed={selected} onClick={onClick}>{selected && <Check />}{children}</button>;
}

function Cell({ value }: { value: string }) {
  const unavailable = value === "—";
  const comingSoon = value === "Coming soon";
  return <span className={unavailable ? "is-unavailable" : comingSoon ? "is-coming-soon" : ""}>{!unavailable && !comingSoon && <Check />}{value}</span>;
}
