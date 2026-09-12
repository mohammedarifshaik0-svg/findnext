"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Globe2, History, Loader2, LockKeyhole, Monitor, Smartphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Analytics = {
  plan: "free" | "live" | "flex" | "care";
  totalViews: number;
  detailed: boolean;
  historyDays: number | null;
  uniqueVisitors: number | null;
  days: { date: string; views: number }[];
  sources: { source: string; views: number }[];
  devices: { device: string; views: number }[];
};

const previewBars = [18, 34, 26, 52, 43, 68, 48, 76, 58, 84, 66, 91, 72, 88];

export function AnalyticsPanel({ onUpgrade }: { onUpgrade: () => void }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [today] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/analytics")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setData(result);
      })
      .catch((reason) => setError(reason.message));
  }, []);

  const series = useMemo(() => {
    const map = new Map(data?.days.map((day) => [day.date, day.views]));
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today - (13 - index) * 86400000).toISOString().slice(0, 10);
      return { date, views: map.get(date) ?? 0 };
    });
  }, [data, today]);
  const max = Math.max(1, ...series.map((day) => day.views));

  if (error) return <Panel><p className="vxl-inline-notice is-error">{error}</p></Panel>;
  if (!data) return <Panel><div className="vxl-empty-state"><Loader2 className="animate-spin" /><strong>Loading analytics</strong></div></Panel>;

  const detailedLocked = !data.detailed;
  const careLocked = data.plan !== "care";
  return (
    <Panel>
      {detailedLocked && (
        <div className="vxl-analytics-intro">
          <div><LockKeyhole /><span><strong>Your view total is live.</strong><small>Visitor trends, sources and devices are ready when you move to Flex.</small></span></div>
          <Button onClick={onUpgrade}>Unlock with Flex</Button>
        </div>
      )}
      <div className="vxl-metric-grid">
        <Metric icon={BarChart3} label="Lifetime portfolio views" value={data.totalViews} />
        <Metric icon={Users} label="Unique daily visitors" value={data.uniqueVisitors ?? "—"} locked={detailedLocked} />
        <Metric icon={Globe2} label="Top traffic source" value={data.sources[0]?.source ?? (detailedLocked ? "Locked" : "No traffic yet")} locked={detailedLocked} />
      </div>
      <LockedFeature locked={detailedLocked} tier="Flex" title="Visitor trends" description="See when your portfolio gets attention across the last 14 days." onUpgrade={onUpgrade}>
        <div className="vxl-chart-card">
          <div><strong>Last 14 days</strong><span>{data.historyDays ? `${data.historyDays}-day history` : "Daily privacy-safe views"}</span></div>
          <div className="vxl-bars">
            {(detailedLocked ? previewBars.map((views, index) => ({ date: `Preview ${index + 1}`, views })) : series).map((day) => (
              <span key={day.date} title={detailedLocked ? undefined : `${day.date}: ${day.views} views`} style={{ height: `${detailedLocked ? day.views : Math.max(4, day.views / max * 100)}%` }} />
            ))}
          </div>
        </div>
      </LockedFeature>
      <div className="grid gap-4 md:grid-cols-2">
        <LockedFeature locked={detailedLocked} tier="Flex" title="Traffic sources" description="Know which sites and shares bring visitors." onUpgrade={onUpgrade}>
          <List title="Traffic sources" rows={data.sources.map((item) => [item.source, item.views])} empty="Sources appear after your first visit." preview={detailedLocked} />
        </LockedFeature>
        <LockedFeature locked={detailedLocked} tier="Flex" title="Visitor devices" description="See whether visitors arrive on mobile or desktop." onUpgrade={onUpgrade}>
          <List title="Devices" rows={data.devices.map((item) => [item.device, item.views])} empty="Devices appear after your first visit." icon={data.devices[0]?.device === "mobile" ? Smartphone : Monitor} preview={detailedLocked} />
        </LockedFeature>
      </div>
      <LockedFeature locked={careLocked} tier="Care" title="One-year history" description="Keep a longer view of your portfolio performance and career momentum." onUpgrade={onUpgrade}>
        <div className="vxl-history-card"><History /><span><strong>365-day analytics history</strong><small>{data.plan === "care" ? "Included with Care" : "Upgrade to Care when you need a longer record."}</small></span></div>
      </LockedFeature>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="vxl-editor-section"><div className="vxl-editor-heading"><span>PERFORMANCE</span><h2>Portfolio analytics</h2><p>Understand how people find and view your public portfolio. No raw IP addresses are stored.</p></div><div className="mt-6 space-y-4">{children}</div></section>;
}

function Metric({ icon: Icon, label, value, locked = false }: { icon: typeof BarChart3; label: string; value: string | number; locked?: boolean }) {
  return <article className={`vxl-metric ${locked ? "is-locked" : ""}`}><Icon /><span>{label}</span><strong>{value}</strong>{locked && <small><LockKeyhole />Flex</small>}</article>;
}

function LockedFeature({ locked, tier, title, description, onUpgrade, children }: { locked: boolean; tier: "Flex" | "Care"; title: string; description: string; onUpgrade: () => void; children: React.ReactNode }) {
  return (
    <div className={`vxl-analytics-feature ${locked ? "is-locked" : ""}`}>
      <div aria-hidden={locked}>{children}</div>
      {locked && <div className="vxl-analytics-lock"><LockKeyhole /><strong>{title}</strong><p>{description}</p><Button size="sm" onClick={onUpgrade}>Unlock with {tier}</Button></div>}
    </div>
  );
}

function List({ title, rows, empty, icon: Icon = Globe2, preview = false }: { title: string; rows: [string, number][]; empty: string; icon?: typeof Globe2; preview?: boolean }) {
  const displayRows: [string, number][] = rows.length ? rows : preview ? [["Direct", 0], ["LinkedIn", 0], ["Shared link", 0]] : [];
  return <div className="vxl-list-card"><h3><Icon />{title}</h3>{displayRows.map(([name, count]) => <div key={name}><span className="capitalize">{name}</span><strong>{count}</strong></div>)}{!rows.length && !preview && <p>{empty}</p>}</div>;
}
