"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Field = "headline" | "summary";
type Tone = "confident" | "concise" | "approachable";
type Option = { id: "recommended" | "concise" | "human"; label: string; text: string; why: string };
type Suggestion = { id: string; field: Field; source_text: string; result_text: string; options?: Option[] };
type Usage = { used: number; allowance: number; remaining: number; resetsAt: string | null; history?: Suggestion[] };
type WritingContext = {
  location: string;
  experiences: Array<{ role: string; company: string; startDate: string; endDate: string; isCurrent: boolean; description: string }>;
  education: Array<{ institution: string; qualification: string; field: string; grade: string; description: string }>;
  items: Array<{ itemType: string; title: string; subtitle: string; description: string; level: string }>;
};

const tones: Array<{ id: Tone; label: string; detail: string }> = [
  { id: "confident", label: "Confident", detail: "Strong and credible" },
  { id: "concise", label: "Concise", detail: "Tighter and direct" },
  { id: "approachable", label: "Approachable", detail: "Warm and natural" },
];

function optionsFor(suggestion: Suggestion): Option[] {
  if (suggestion.options?.length) return suggestion.options;
  return [{ id: "recommended", label: "Saved suggestion", text: suggestion.result_text, why: "Generated with the earlier VXL writing assistant." }];
}

export function AiWriting({ headline, summary, context, onApply }: { headline: string; summary: string; context: WritingContext; onApply: (field: Field, value: string) => void }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [targetRole, setTargetRole] = useState("");
  const [tone, setTone] = useState<Tone>("confident");
  const [busyField, setBusyField] = useState<Field | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const response = await fetch("/api/ai/improve", { cache: "no-store" });
    if (response.ok) setUsage(await response.json());
  }

  useEffect(() => {
    let active = true;
    fetch("/api/ai/improve", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("usage_unavailable");
      const result = await response.json();
      if (active) setUsage(result);
    }).catch(() => { if (active) setMessage("AI usage is temporarily unavailable. Reload before generating."); });
    return () => { active = false; };
  }, []);

  async function improve(field: Field) {
    setBusyField(field);
    setMessage("");
    setSuggestion(null);
    setSelectedOption(0);
    try {
      const response = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          field,
          text: field === "headline" ? headline : summary,
          targetRole,
          tone,
          context: { ...context, headline, summary },
        }),
        signal: AbortSignal.timeout(55000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not generate suggestions.");
      setSuggestion(result);
      await refresh().catch(() => setMessage("Suggestions are saved. Reload to refresh your remaining allowance."));
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "TimeoutError"
        ? "AI Writing is taking longer than expected. No improvement is charged unless a result is saved. Reload to check saved sessions before retrying."
        : error instanceof Error ? error.message : "Could not reach AI Writing. Reload to check saved suggestions before retrying.");
    } finally {
      setBusyField(null);
    }
  }

  const options = suggestion ? optionsFor(suggestion) : [];
  const activeOption = options[selectedOption] ?? options[0];
  const stale = suggestion && (suggestion.field === "headline" ? headline : summary).trim() !== suggestion.source_text;
  const remaining = usage?.remaining ?? 0;
  const groundingParts = [
    context.experiences.length ? `${context.experiences.length} role${context.experiences.length === 1 ? "" : "s"}` : "",
    context.education.length ? `${context.education.length} education entr${context.education.length === 1 ? "y" : "ies"}` : "",
    context.items.length ? `${context.items.length} skill, project or achievement entr${context.items.length === 1 ? "y" : "ies"}` : "",
  ].filter(Boolean);

  return <section className="mt-6 overflow-hidden rounded-2xl border border-current/15 bg-current/[.025]" aria-label="VXL AI writing studio">
    <div className="border-b border-current/10 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles className="h-4 w-4" /></span>
        <div>
          <h3 className="font-semibold">VXL Writing Studio</h3>
          <p className="mt-1 text-sm leading-6 opacity-75">Get three recruiter-aware directions grounded in your profile—not a generic rewrite.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="field">
          <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5" />Target role or direction <small>(optional)</small></span>
          <Input value={targetRole} maxLength={120} onChange={(event) => setTargetRole(event.target.value)} placeholder="e.g. Business Analyst, product strategy, fintech" />
        </label>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] opacity-60">Preferred voice</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Preferred writing voice">
            {tones.map((item) => <button key={item.id} type="button" onClick={() => setTone(item.id)} aria-pressed={tone === item.id} title={item.detail} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${tone === item.id ? "border-indigo-600 bg-indigo-600 text-white" : "border-current/15 hover:border-current/35"}`}>{item.label}</button>)}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={Boolean(busyField) || remaining < 1 || headline.trim().length < 10} onClick={() => void improve("headline")}>
          {busyField === "headline" ? <Loader2 className="animate-spin" /> : <Sparkles />} {busyField === "headline" ? "Crafting headlines…" : "Create 3 headlines"}
        </Button>
        <Button variant="outline" disabled={Boolean(busyField) || remaining < 1 || summary.trim().length < 10} onClick={() => void improve("summary")}>
          {busyField === "summary" ? <Loader2 className="animate-spin" /> : <Sparkles />} {busyField === "summary" ? "Crafting summaries…" : "Create 3 summaries"}
        </Button>
      </div>
      <p className="mt-3 text-xs font-medium opacity-75">{groundingParts.length ? `Grounding suggestions in ${groundingParts.join(" · ")}.` : "Add experience, skills or projects for more specific suggestions; with limited context, AI will only refine your existing words."}</p>
      <p className="mt-3 text-xs leading-5 opacity-65">One successful generation uses one improvement and gives you three options. Failed generations use none. The selected text and relevant profile details are sent securely through Vercel AI Gateway; always review before applying.</p>
      <p className="mt-2 text-sm font-medium" aria-live="polite">{usage ? `${usage.remaining} of ${usage.allowance} improvements remaining${usage.resetsAt ? ` · resets ${new Date(usage.resetsAt).toLocaleDateString()}` : ""}` : "Loading AI allowance…"}</p>
      {message && <p role="status" aria-live="polite" className="mt-3 rounded-lg border border-current/10 px-3 py-2 text-sm">{message}</p>}
    </div>

    {suggestion && activeOption && <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div><p className="text-xs font-semibold uppercase tracking-[.12em] opacity-55">Three directions</p><h4 className="mt-1 font-semibold">Choose the version that sounds like you</h4></div>
        <span className="text-xs opacity-60">{suggestion.field === "headline" ? "Headline" : "Summary"}</span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {options.map((option, index) => <button key={option.id} type="button" onClick={() => setSelectedOption(index)} className={`rounded-xl border p-4 text-left transition ${selectedOption === index ? "border-indigo-500 bg-indigo-500/[.08] shadow-sm" : "border-current/10 hover:border-current/25"}`}>
          <span className="flex items-center justify-between gap-2 text-sm font-semibold">{option.label}{selectedOption === index && <Check className="h-4 w-4 text-indigo-500" />}</span>
          <span className="mt-2 block text-xs leading-5 opacity-65">{option.why}</span>
        </button>)}
      </div>
      <div className="mt-4 rounded-xl border border-current/10 bg-current/[.025] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[.12em] opacity-55">Selected suggestion</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{activeOption.text}</p>
      </div>
      {stale && <p className="mt-3 text-sm">Your original text changed after generation. Generate again to avoid overwriting the newer draft.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={Boolean(busyField) || Boolean(stale)} onClick={() => { onApply(suggestion.field, activeOption.text); setSuggestion(null); setMessage("Applied to your working draft. Review it, then save when ready; your live portfolio is unchanged."); }}>Use selected version</Button>
        <Button variant="ghost" onClick={() => setSuggestion(null)}>Dismiss</Button>
      </div>
      <details className="mt-5 border-t border-current/10 pt-4"><summary className="cursor-pointer text-sm font-medium">Compare with original</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 opacity-70">{suggestion.source_text}</p></details>
    </div>}

    {!!usage?.history?.length && <details className="border-t border-current/10 p-5 sm:p-6"><summary className="cursor-pointer text-sm font-medium">Saved writing sessions</summary><div className="mt-3 flex flex-wrap gap-2">{usage.history.map((item) => <Button key={item.id} variant="outline" size="sm" onClick={() => { setSuggestion(item); setSelectedOption(0); }}>{item.field === "headline" ? "Headline" : "Summary"} · {item.result_text.slice(0, 34)}…</Button>)}</div></details>}
  </section>;
}
