"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BriefcaseBusiness, CheckCircle2, Clock3, FolderKanban, GraduationCap, History, Layers3, Loader2, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portfolioTemplateNames } from "@/lib/phase2-templates";

type Version = {
  id: string;
  createdAt: string;
  versionNumber: number | null;
  isCurrent: boolean;
  fullName: string;
  headline: string;
  theme: string;
  counts: { experiences: number; education: number; projects: number; skills: number; showcases: number; customSections: number };
};

type HistoryResponse = {
  plan?: string;
  available?: boolean;
  retentionDays?: number | null;
  latestOnly?: boolean;
  versions?: Version[];
  page?: number;
  hasMore?: boolean;
  total?: number;
  error?: string;
};

async function readResponse(response: Response) {
  const result = await response.json().catch(() => ({})) as HistoryResponse;
  if (!response.ok) throw new Error(result.error || "Version history is temporarily unavailable.");
  return result;
}

export function SettingsPanel({ email, onRestored, onUpgrade }: { email: string; onRestored: () => void; onUpgrade: () => void }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [meta, setMeta] = useState({ plan: "free", available: false, retentionDays: null as number | null, latestOnly: false, total: 0, hasMore: false, page: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async (page = 0, append = false, signal?: AbortSignal) => {
    if (append) setLoadingMore(true);
    try {
      const response = await fetch(`/api/versions?page=${page}`, { cache: "no-store", credentials: "same-origin", signal });
      const result = await readResponse(response);
      setVersions((current) => append ? [...current, ...(result.versions ?? [])] : result.versions ?? []);
      setMeta({
        plan: result.plan ?? "free",
        available: Boolean(result.available),
        retentionDays: typeof result.retentionDays === "number" ? result.retentionDays : null,
        latestOnly: Boolean(result.latestOnly),
        total: Number(result.total) || 0,
        hasMore: Boolean(result.hasMore),
        page: Number(result.page) || 0,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Version history is temporarily unavailable." });
    } finally {
      if (!append) setLoading(false);
      if (append) setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(0, false, controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  async function restore(version: Version) {
    setBusy(version.id);
    setNotice(null);
    try {
      const response = await fetch("/api/versions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revisionId: version.id }),
      });
      const result = await readResponse(response);
      if (!result) throw new Error("This portfolio version could not be restored.");
      setConfirmId("");
      setNotice({ tone: "success", text: "Version restored to your private draft. Your live portfolio was not changed. Reloading the editor…" });
      window.setTimeout(onRestored, 1100);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not restore this version." });
    } finally {
      setBusy("");
    }
  }

  const retention = meta.latestOnly ? "Latest published version" : meta.retentionDays ? `${meta.retentionDays} days` : "Requires an active plan";
  return (
    <section className="vxl-editor-section">
      <div className="vxl-editor-heading"><span>ACCOUNT & HISTORY</span><h2>Settings</h2><p>Manage your account context, privacy, and recoverable portfolio versions.</p></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="vxl-list-card"><h3><ShieldCheck />Account</h3><div><span>Signed in as</span><strong className="truncate">{email}</strong></div><div><span>Workspace</span><strong>Private by default</strong></div></div>
        <div className="vxl-list-card"><h3><Clock3 />Version allowance</h3><div><span>History window</span><strong>{retention}</strong></div><div><span>Available snapshots</span><strong>{meta.total}</strong></div><p>Restoring changes only your private draft. Your public portfolio stays untouched until you review and publish again.</p></div>
      </div>

      <div className="vxl-version-library">
        <header><div><span>VERSION LIBRARY</span><h3>Published portfolio history</h3><p>Every snapshot is frozen at publication, including its content, template and available Phase 2 sections.</p></div><History /></header>
        {loading ? <div className="vxl-version-empty"><Loader2 className="animate-spin" /><span>Loading your published versions…</span></div> : !meta.available ? (
          <div className="vxl-version-locked"><Sparkles /><div><strong>Version restoration activates with a VXL plan</strong><p>Live restores the latest publication. Flex keeps 90 days, and Care keeps one year.</p></div><Button type="button" onClick={onUpgrade}>View plans</Button></div>
        ) : !versions.length ? (
          <div className="vxl-version-empty"><History /><span>No published versions yet. Your first snapshot appears after publishing.</span></div>
        ) : (
          <div className="vxl-version-list">
            {versions.map((version) => (
              <article key={version.id} className={confirmId === version.id ? "is-confirming" : ""}>
                <div className="vxl-version-index"><strong>{version.versionNumber ? `V${version.versionNumber}` : "V—"}</strong><span>{version.isCurrent ? "CURRENT" : "ARCHIVE"}</span></div>
                <div className="vxl-version-copy"><div><strong>{version.headline}</strong>{version.isCurrent && <span className="vxl-version-current"><CheckCircle2 />Live source</span>}</div><p>{version.fullName} · {portfolioTemplateNames[version.theme] ?? version.theme}</p><time dateTime={version.createdAt}>{new Date(version.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>
                <div className="vxl-version-counts"><span><BriefcaseBusiness />{version.counts.experiences} roles</span><span><FolderKanban />{version.counts.projects} projects</span><span><GraduationCap />{version.counts.education} education</span><span><Layers3 />{version.counts.showcases + version.counts.customSections} enhanced</span></div>
                <Button type="button" variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => setConfirmId(version.id)}><RotateCcw />Restore</Button>
                {confirmId === version.id && <div className="vxl-version-confirm"><AlertCircle /><div><strong>Restore this snapshot to your private draft?</strong><p>Your current unsaved editor changes will be replaced after reload. The live portfolio remains exactly as it is.</p><div><Button type="button" variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => setConfirmId("")}><X />Cancel</Button><Button type="button" size="sm" disabled={Boolean(busy)} onClick={() => restore(version)}>{busy === version.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}Yes, restore draft</Button></div></div></div>}
              </article>
            ))}
            {meta.hasMore && <Button className="vxl-version-more" type="button" variant="outline" disabled={Boolean(busy) || loadingMore} onClick={() => load(meta.page + 1, true)}>{loadingMore && <Loader2 className="animate-spin" />}Load older versions</Button>}
          </div>
        )}
      </div>
      {notice && <div className={`vxl-inline-notice mt-4 is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.tone === "error" ? <AlertCircle /> : <CheckCircle2 />}{notice.text}</div>}
    </section>
  );
}
