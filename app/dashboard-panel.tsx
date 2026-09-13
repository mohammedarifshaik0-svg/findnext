"use client";
import { useState } from "react";
import { BarChart3, CheckCircle2, Clock3, Copy, ExternalLink, Eye, FileText, LayoutTemplate, PenLine, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanBadge, type WorkspacePlan } from "@/app/plan-badge";

const planHighlights: Record<WorkspacePlan, { eyebrow: string; title: string; description: string; features: string[] }> = {
  free: {
    eyebrow: "YOUR CURRENT VERSION",
    title: "Build freely. Start seven live days when you publish.",
    description: "Your draft stays private and saved. Upgrade only when you are ready to keep the finished portfolio online.",
    features: ["Every template", "Private draft editing", "7 live days"],
  },
  live: {
    eyebrow: "YOUR CURRENT PLAN",
    title: "The essentials for one polished portfolio.",
    description: "Keep your site live and use focused monthly allowances when your story needs an update.",
    features: ["2 published updates", "3 AI improvements", "All templates"],
  },
  flex: {
    eyebrow: "YOUR CURRENT PLAN",
    title: "Built for a career that keeps moving.",
    description: "Publish whenever you need, explore deeper insights and present a clean, brand-free portfolio.",
    features: ["Unlimited publishing", "90-day analytics", "No VXL wordmark"],
  },
  care: {
    eyebrow: "YOUR CURRENT PLAN",
    title: "Premium tools, with a real person beside you.",
    description: "Get the fullest VXL experience, longer insight history and one human-managed update every cycle.",
    features: ["1 managed update", "365-day analytics", "Priority human help"],
  },
};

export function DashboardPanel({ name, headline, isPublic, completion, slug, plan, planUntil, onOpen, onCopy, onShare }: { name: string; headline: string; isPublic: boolean; completion: number; slug: string; plan: WorkspacePlan; planUntil: string | null; onOpen: (tab: string) => void; onCopy: () => void; onShare: () => void }) {
  const [greeting] = useGreeting();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "VX";
  const planCopy = planHighlights[plan];
  return (
    <section className="vxl-dashboard">
      <header>
        <div>
          <span>VXL WORKSPACE</span>
          <div className="vxl-dashboard-title">
            <h1>{greeting}, {name.split(" ")[0] || "there"}</h1>
            <PlanBadge plan={plan} compact />
          </div>
          <p>Your portfolio, progress, and next action in one calm workspace.</p>
        </div>
        <Button className="vxl-studio-primary" onClick={() => onOpen("profile")}>
          <PenLine />
          Edit portfolio
        </Button>
      </header>
      <div className="vxl-dashboard-stats">
        <Stat icon={FileText} label="Portfolio" value="1" detail={isPublic ? "Published website" : "Private draft"} />
        <Stat icon={CheckCircle2} label="Profile strength" value={`${completion}%`} detail={completion === 100 ? "Ready to publish" : "Keep building your story"} />
        <Stat icon={Clock3} label="Status" value={isPublic ? "Live" : "Draft"} detail={isPublic ? "Visible to visitors" : "Visible only to you"} />
        <Stat icon={BarChart3} label="Insights" value="Ready" detail="Privacy-safe analytics" />
      </div>
      <section className={`vxl-plan-highlight is-${plan}`} aria-label={`${plan} plan overview`}>
        <div>
          <PlanBadge plan={plan} />
          <span>{planCopy.eyebrow}</span>
          <h2>{planCopy.title}</h2>
          <p>{planCopy.description}</p>
          <div className="vxl-plan-highlight-features">
            {planCopy.features.map((feature) => <small key={feature}><CheckCircle2 />{feature}</small>)}
          </div>
        </div>
        <aside>
          {planUntil && plan !== "free" ? <p><Clock3 />Active through <strong>{new Date(planUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></p> : <p><Sparkles />Your work stays saved even if access changes.</p>}
          <Button variant="outline" onClick={() => onOpen("plans")}>{plan === "care" ? "View Care benefits" : plan === "free" ? "Compare plans" : "Manage plan"}</Button>
        </aside>
      </section>
      <div className="vxl-launch-guide">
        <span>YOUR LAUNCH PATH</span>
        <button onClick={() => onOpen("profile")}>
          <b>1</b>
          <strong>Build your story</strong>
          <small>Add and review your content</small>
        </button>
        <button onClick={() => onOpen("templates")}>
          <b>2</b>
          <strong>Choose a look</strong>
          <small>Preview all included templates</small>
        </button>
        <button onClick={() => onOpen("publish")}>
          <b>3</b>
          <strong>Publish clearly</strong>
          <small>{plan === "free" ? "Free version stays live for 7 days" : `${plan.toUpperCase()} plan is active`}</small>
        </button>
      </div>
      <div className="vxl-dashboard-body">
        <article className="vxl-portfolio-card">
          <div className="vxl-portfolio-art">
            <div className="vxl-portfolio-sheet">
              <span>VXL · PROFESSIONAL STORY</span>
              <strong>{initials}</strong>
              <p>{headline || "Your experience, made visible."}</p>
              <div><i /><i /><i /></div>
              <small>{isPublic ? "LIVE NOW" : `${completion}% READY`}</small>
            </div>
          </div>
          <div>
            <span>{isPublic ? "PUBLISHED" : "PRIVATE DRAFT"}</span>
            <h2>{headline || `${name}'s professional portfolio`}</h2>
            <p>thevxl.com/p/{slug || "your-name"}</p>
            <div className="vxl-dashboard-card-actions">
              {isPublic && slug ? (
                <>
                  <Button className="vxl-studio-primary" onClick={onCopy}><Copy />Copy link</Button>
                  <Button variant="outline" onClick={onShare}><Share2 />Share</Button>
                  <Button variant="outline" asChild><a href={`/p/${slug}`} target="_blank" rel="noreferrer"><ExternalLink />Open site</a></Button>
                  <Button variant="ghost" onClick={() => onOpen("analytics")}><BarChart3 />Analytics</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpen("templates")}><LayoutTemplate />Templates</Button>
                  <Button variant="outline" onClick={() => onOpen("analytics")}><BarChart3 />Analytics</Button>
                  {slug && <Button variant="outline" onClick={() => window.open(`/p/${slug}`, "_blank")}><Eye />Preview</Button>}
                </>
              )}
            </div>
          </div>
        </article>
        <aside className="vxl-next-card">
          <span>NEXT BEST STEP</span>
          <strong>{completion === 100 ? (isPublic ? "Review your latest analytics" : "Publish your finished story") : "Complete your portfolio"}</strong>
          <p>{completion === 100 ? "Everything is ready. Keep your public story current and monitor how it performs." : `${100 - completion}% remains before your portfolio is ready to publish.`}</p>
          <Button onClick={() => onOpen(completion === 100 ? (isPublic ? "analytics" : "publish") : "profile")}>Continue</Button>
        </aside>
      </div>
    </section>
  );
}
function useGreeting() {
  return useState(() => {
    const value = new Date().getHours();
    return value < 12 ? "Good morning" : value < 18 ? "Good afternoon" : "Good evening";
  });
}
function Stat({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string; detail: string }) {
  return (
    <article>
      <div>
        <span>{label}</span>
        <Icon />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
