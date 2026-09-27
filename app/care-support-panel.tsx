"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Crown, LifeBuoy, Loader2, Send, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SupportRequest = {
  id: string;
  reference: string;
  request_type: "priority_support" | "managed_update";
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
};

type SupportData = {
  enabled: boolean;
  eligible: boolean;
  plan: string;
  cycle: { startsAt: string; endsAt: string } | null;
  managedUpdatesRemaining: number;
  openRequests: number;
  requests: SupportRequest[];
};

const categories = [
  ["portfolio", "Portfolio content"],
  ["custom_domain", "Custom domain"],
  ["technical", "Technical issue"],
  ["account", "Account access"],
  ["billing", "Plan or billing"],
  ["other", "Something else"],
] as const;

const statusLabels: Record<SupportRequest["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting for you",
  resolved: "Resolved",
  closed: "Closed",
};

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Care Support is temporarily unavailable.");
  return body;
}

export function CareSupportPanel({ access, onUpgrade }: { access: boolean; onUpgrade: () => void }) {
  const [data, setData] = useState<SupportData | null>(null);
  const [requestType, setRequestType] = useState<SupportRequest["request_type"]>("priority_support");
  const [category, setCategory] = useState("portfolio");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/care-support", { cache: "no-store", credentials: "same-origin", signal });
      setData(await responseJson(response));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Care Support is temporarily unavailable." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/care-support", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestType, category, subject, message }),
      });
      const result = await responseJson(response);
      setSubject("");
      setMessage("");
      setNotice({ tone: "success", text: `Request ${result.request.reference} is in the Care priority queue.` });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not create your request." });
    } finally {
      setSending(false);
    }
  }

  const eligible = access && data?.eligible;
  const managedAvailable = Boolean(data?.managedUpdatesRemaining);
  return (
    <section className="vxl-editor-section">
      <div className="vxl-editor-heading"><span>CARE CONCIERGE</span><h2>Priority support</h2><p>Ask a real person for help, track every request and use your managed portfolio update without leaving VXL.</p></div>
      {loading && !data ? <div className="vxl-empty-state mt-6"><Loader2 className="animate-spin" /><strong>Loading Care Support</strong></div> : !eligible ? (
        <div className="vxl-version-locked mt-6"><Crown /><div><strong>Care puts a human beside the product</strong><p>Priority requests and one managed portfolio update every 28 days activate with an active Care plan.</p></div><Button type="button" onClick={onUpgrade}>View Care</Button></div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="vxl-metric-grid">
            <SupportMetric icon={LifeBuoy} label="Active requests" value={data.openRequests} />
            <SupportMetric icon={Wrench} label="Managed updates left" value={data.managedUpdatesRemaining} />
            <SupportMetric icon={Clock3} label="Current allowance" value={data.cycle ? `Until ${new Date(data.cycle.endsAt).toLocaleDateString([], { day: "numeric", month: "short" })}` : "Active"} />
          </div>

          <form className="vxl-care-request" onSubmit={submit}>
            <header><div><span>NEW REQUEST</span><h3>What would you like us to help with?</h3></div><Sparkles /></header>
            <div className="vxl-care-request-types" role="group" aria-label="Request type">
              <button type="button" className={requestType === "priority_support" ? "active" : ""} onClick={() => setRequestType("priority_support")}><LifeBuoy /><span><strong>Priority support</strong><small>Questions, troubleshooting and guided help</small></span></button>
              <button type="button" disabled={!managedAvailable} className={requestType === "managed_update" ? "active" : ""} onClick={() => setRequestType("managed_update")}><Wrench /><span><strong>Managed update</strong><small>{managedAvailable ? "Use your one update for this 28-day cycle" : "Already used this cycle"}</small></span></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="field"><span>Subject</span><Input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={160} required placeholder={requestType === "managed_update" ? "What should we update?" : "What do you need help with?"} /></label>
            </div>
            <label className="field mt-4"><span>{requestType === "managed_update" ? "Update instructions" : "Details"}</span><Textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={20} maxLength={5000} required rows={6} placeholder={requestType === "managed_update" ? "Describe the exact portfolio changes, links and outcome you want. VXL will confirm anything unclear before editing." : "Tell us what happened, what you expected and any useful context."} /></label>
            <div className="vxl-care-submit"><p>No passwords, OTPs, card details or private credentials. We’ll use your request reference for every follow-up.</p><Button type="submit" disabled={sending || (requestType === "managed_update" && !managedAvailable)}>{sending ? <Loader2 className="animate-spin" /> : <Send />}Send request</Button></div>
          </form>

          <div className="vxl-care-history">
            <header><div><span>REQUEST HISTORY</span><h3>Your Care queue</h3></div><strong>{data.requests.length}</strong></header>
            {!data.requests.length ? <div className="vxl-version-empty"><LifeBuoy /><span>Your support requests will appear here with a reference and live status.</span></div> : data.requests.map((item) => (
              <article key={item.id}>
                <div><span>{item.request_type === "managed_update" ? "MANAGED UPDATE" : "PRIORITY SUPPORT"}</span><h4>{item.subject}</h4><p>{item.reference} · {new Date(item.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></div>
                <span className={`vxl-care-status is-${item.status}`}>{statusLabels[item.status]}</span>
              </article>
            ))}
          </div>
        </div>
      )}
      {notice && <div className={`vxl-inline-notice mt-4 is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.tone === "error" ? <AlertCircle /> : <CheckCircle2 />}{notice.text}</div>}
    </section>
  );
}

function SupportMetric({ icon: Icon, label, value }: { icon: typeof LifeBuoy; label: string; value: string | number }) {
  return <article className="vxl-metric"><Icon /><span>{label}</span><strong>{value}</strong></article>;
}
