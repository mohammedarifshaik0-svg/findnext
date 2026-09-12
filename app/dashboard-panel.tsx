"use client";
import { useState } from "react";
import { BarChart3, CheckCircle2, Clock3, Eye, FileText, LayoutTemplate, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
export function DashboardPanel({ name, headline, isPublic, completion, slug, plan, onOpen }: { name: string; headline: string; isPublic: boolean; completion: number; slug: string; plan: "free" | "live" | "flex" | "care"; onOpen: (tab: string) => void }) {
  const [greeting] = useGreeting();
  return (
    <section className="vxl-dashboard">
      <header>
        <div>
          <span>VXL WORKSPACE</span>
          <h1>
            {greeting}, {name.split(" ")[0] || "there"}
          </h1>
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
            <span />
            <i />
            <b />
          </div>
          <div>
            <span>{isPublic ? "PUBLISHED" : "PRIVATE DRAFT"}</span>
            <h2>{headline || `${name}'s professional portfolio`}</h2>
            <p>thevxl.com/p/{slug || "your-name"}</p>
            <div>
              <Button variant="outline" onClick={() => onOpen("templates")}>
                <LayoutTemplate />
                Templates
              </Button>
              <Button variant="outline" onClick={() => onOpen("analytics")}>
                <BarChart3 />
                Analytics
              </Button>
              {slug && (
                <Button variant="outline" onClick={() => window.open(`/p/${slug}`, "_blank")}>
                  <Eye />
                  Preview
                </Button>
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
