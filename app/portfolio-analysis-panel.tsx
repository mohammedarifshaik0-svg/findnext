"use client";

import { ArrowRight, Award, BarChart3, CheckCircle2, SearchCheck, ShieldCheck, Target } from "lucide-react";
import type { PortfolioAnalysis } from "@/lib/portfolio-analysis";
import { Button } from "@/components/ui/button";

const categoryIcons = { positioning: Target, credibility: ShieldCheck, proof: Award, discoverability: SearchCheck } as const;

export function PortfolioAnalysisPanel({ analysis, onOpen }: { analysis: PortfolioAnalysis; onOpen: (tab: string) => void }) {
  return <section className="vxl-editor-section vxl-analysis-panel">
    <div className="vxl-editor-heading"><span>PORTFOLIO REVIEW</span><h2>What your portfolio proves</h2><p>A transparent content review based only on what is currently in your draft. This is guidance—not a hiring prediction.</p></div>
    <div className="vxl-analysis-hero">
      <div className="vxl-analysis-score" aria-label={`Portfolio evidence score ${analysis.score} out of 100`}>
        <span>{analysis.label}</span><strong>{analysis.score}</strong><small>/ 100</small>
      </div>
      <div><h3>{analysis.summary}</h3><p>Your score changes as you improve the draft. Nothing is sent to an AI model to calculate it, and no recruiter activity affects it.</p></div>
    </div>
    <div className="vxl-analysis-categories">
      {analysis.categories.map((item) => {
        const Icon = categoryIcons[item.id];
        const percent = Math.round(item.score / item.maximum * 100);
        return <article key={item.id}><header><Icon /><strong>{item.label}</strong><span>{item.score}/{item.maximum}</span></header><div className="vxl-analysis-bar"><i style={{ width: `${percent}%` }} /></div><p>{item.detail}</p></article>;
      })}
    </div>
    <div className="vxl-analysis-columns">
      <section><div className="vxl-analysis-section-title"><CheckCircle2 /><div><h3>Already working</h3><p>Signals worth preserving as your portfolio changes.</p></div></div>
        {analysis.strengths.length ? <ul className="vxl-analysis-strengths">{analysis.strengths.map((strength) => <li key={strength}><CheckCircle2 />{strength}</li>)}</ul> : <div className="vxl-analysis-empty"><BarChart3 /><strong>Your first strength will appear here.</strong><p>Complete the priority actions to build a stronger evidence base.</p></div>}
      </section>
      <section><div className="vxl-analysis-section-title"><Target /><div><h3>Highest-impact actions</h3><p>Ordered by the score each improvement can unlock.</p></div></div>
        {analysis.actions.length ? <div className="vxl-analysis-actions">{analysis.actions.map((action, index) => <article key={action.id}><b>{index + 1}</b><div><strong>{action.title}</strong><p>{action.detail}</p><small>Up to +{action.impact} points</small></div><Button variant="ghost" size="sm" onClick={() => onOpen(action.tab)}>Improve <ArrowRight /></Button></article>)}</div> : <div className="vxl-analysis-empty"><Award /><strong>No major content gaps found.</strong><p>Keep your evidence current and review the public experience before sharing.</p></div>}
      </section>
    </div>
  </section>;
}
