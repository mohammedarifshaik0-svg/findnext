"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Suggestion = { id: string; field: "headline" | "summary"; source_text: string; result_text: string };
type Usage = { used: number; allowance: number; remaining: number; resetsAt: string | null; history?: Suggestion[] };

export function AiWriting({ headline, summary, onApply }: { headline: string; summary: string; onApply: (field: "headline" | "summary", value: string) => void }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    const response = await fetch("/api/ai/improve");
    if (response.ok) setUsage(await response.json());
  }
  useEffect(() => {
    let active = true;
    fetch("/api/ai/improve").then(async response => {
      if (!response.ok) throw new Error("usage_unavailable");
      const result = await response.json();
      if (active) setUsage(result);
    }).catch(() => { if (active) setMessage("Save your draft, then reload to see AI usage."); });
    return () => { active = false; };
  }, []);

  async function improve(field: "headline" | "summary") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/ai/improve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: crypto.randomUUID(), field, text: field === "headline" ? headline : summary }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not generate a suggestion.");
      setSuggestion(result);
      await refresh().catch(() => setMessage("Suggestion saved. Reload to refresh your remaining allowance."));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reach AI writing. Reload to check saved suggestions before retrying."); }
    finally { setBusy(false); }
  }

  const stale = suggestion && (suggestion.field === "headline" ? headline : summary).trim() !== suggestion.source_text;
  return <section className="mt-6 rounded-xl border border-current/15 p-5" aria-label="AI writing assistant">
    <h3 className="font-semibold">Improve your writing</h3>
    <p className="mt-2 text-sm opacity-75">AI edits only the text you choose. Review every fact before applying. One successful suggestion uses one improvement, even if you discard it. Failed generations use none.</p>
    <p className="mt-2 text-sm" aria-live="polite">{usage ? `${usage.used} / ${usage.allowance} used · ${usage.remaining} remaining${usage.resetsAt ? ` · Current allowance period ends ${new Date(usage.resetsAt).toLocaleDateString()}` : " · Introductory allowance"}` : "Loading AI allowance…"}</p>
    <p className="mt-2 text-xs opacity-65">The selected text is sent to our AI provider through Vercel AI Gateway to generate your suggestion.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy || !usage?.remaining || headline.trim().length < 10} onClick={() => improve("headline")}>Improve headline</Button>
      <Button variant="outline" disabled={busy || !usage?.remaining || summary.trim().length < 10} onClick={() => improve("summary")}>Improve summary</Button>
    </div>
    {busy && <p role="status" className="mt-3 text-sm">Writing your suggestion…</p>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    {suggestion && <div className="mt-4 space-y-3">
      <div><p className="text-xs uppercase opacity-60">Original</p><p className="whitespace-pre-wrap text-sm">{suggestion.source_text}</p></div>
      <div><p className="text-xs uppercase opacity-60">Suggested</p><p className="whitespace-pre-wrap text-sm">{suggestion.result_text}</p></div>
      {stale && <p className="text-sm">Your text changed since this suggestion. Copy useful wording manually to preserve your newer edits.</p>}
      <div className="flex gap-2"><Button disabled={busy || Boolean(stale)} onClick={() => { onApply(suggestion.field, suggestion.result_text); setSuggestion(null); setMessage("Applied to your working draft. Save when ready; your public portfolio is unchanged."); }}>Use in draft</Button><Button variant="ghost" onClick={() => setSuggestion(null)}>Dismiss</Button></div>
    </div>}
    {!!usage?.history?.length && <details className="mt-4"><summary className="cursor-pointer text-sm">Saved suggestions</summary><div className="mt-2 flex flex-wrap gap-2">{usage.history.map(item => <Button key={item.id} variant="outline" size="sm" onClick={() => setSuggestion(item)}>{item.field === "headline" ? "Headline" : "Summary"} · {item.result_text.slice(0,32)}…</Button>)}</div></details>}
  </section>;
}
