"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Circle, Copy, ExternalLink, Globe2, Loader2, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RecordValue = { type?: string; domain?: string; name?: string; value?: string; reason?: string };
type Domain = { id: string; domain: string; portfolioSlug: string; status: "pending" | "verification_required" | "active" | "error"; vercelVerified: boolean; dnsConfigured: boolean; verification: RecordValue[]; dnsRecords: RecordValue[]; lastError: string | null; lastCheckedAt: string | null };
type ResponseBody = { featureEnabled?: boolean; access?: boolean; plan?: string; domain?: Domain | null; error?: string };

async function read(response: Response) {
  const body = await response.json().catch(() => ({})) as ResponseBody;
  if (!response.ok) throw new Error(body.error || "Custom-domain settings are temporarily unavailable.");
  return body;
}

export function CustomDomainPanel({ onUpgrade }: { onUpgrade: () => void }) {
  const [state, setState] = useState<ResponseBody | null>(null);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState<"connect" | "refresh" | "remove" | "">("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copied, setCopied] = useState("");
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/domains", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(read)
      .then(setState)
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not load custom-domain settings." }); })
    return () => controller.abort();
  }, []);

  async function action(kind: "connect" | "refresh") {
    setBusy(kind);
    setNotice(null);
    try {
      const response = await fetch("/api/domains", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: kind, domain }) });
      const result = await read(response);
      setState((current) => ({ ...current, ...result, access: true, featureEnabled: true }));
      setNotice({ tone: "success", text: result.domain?.status === "active" ? "Your custom domain is verified and active." : "Domain checked. Complete the records below, then check again." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "The domain could not be updated." });
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!state?.domain) return;
    setBusy("remove");
    setNotice(null);
    try {
      await read(await fetch("/api/domains", { method: "DELETE", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ domain: state.domain.domain }) }));
      setState((current) => ({ ...current, domain: null }));
      setDomain("");
      setConfirmRemove(false);
      setNotice({ tone: "success", text: "The custom domain was disconnected. Your VXL address still works." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "The domain could not be disconnected." });
    } finally {
      setBusy("");
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setNotice({ tone: "error", text: "Copy was blocked. Select the DNS value manually." });
    }
  }

  if (!state && !notice) return <section className="vxl-editor-section"><div className="vxl-domain-loading"><Loader2 className="animate-spin" />Preparing custom domains…</div></section>;
  const connected = state?.domain;
  return (
    <section className="vxl-editor-section">
      <div className="vxl-editor-heading"><span>YOUR PROFESSIONAL ADDRESS</span><h2>Custom domain</h2><p>Connect a domain you already own and keep VXL’s portfolio engine underneath it.</p></div>
      {!state?.access ? (
        <div className="vxl-domain-locked"><Globe2 /><div><strong>Custom domains are available with Flex and Care</strong><p>Flex includes self-service connection. Care includes guided setup with a real person if your DNS provider gets confusing.</p></div><Button type="button" onClick={onUpgrade}>View plans</Button></div>
      ) : !connected ? (
        <div className="vxl-domain-connect">
          <div className="vxl-context-note"><ShieldCheck /><div><strong>Your domain stays yours</strong><p>VXL only connects it to your portfolio. We never transfer ownership or alter your email records.</p></div></div>
          <label className="field"><span>Domain or portfolio subdomain</span><div><Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="portfolio.yourname.com" autoCapitalize="none" autoCorrect="off" /><Button type="button" className="vxl-studio-primary" disabled={!domain.trim() || Boolean(busy)} onClick={() => action("connect")}>{busy === "connect" ? <Loader2 className="animate-spin" /> : <Globe2 />}Connect domain</Button></div><small>Use a domain you already own. A subdomain like portfolio.yourname.com is usually the cleanest option.</small></label>
          {state?.plan === "care" && <div className="vxl-domain-care"><CheckCircle2 /><div><strong>Care includes guided setup</strong><p>Email <a href="mailto:hello@thevxl.com?subject=Care custom domain setup">hello@thevxl.com</a> and we’ll help you complete the DNS steps.</p></div></div>}
        </div>
      ) : (
        <div className="vxl-domain-workflow">
          <header><div><span className={`is-${connected.status}`}>{connected.status === "active" ? "ACTIVE" : "SETUP IN PROGRESS"}</span><h3>{connected.domain}</h3><a href={`https://${connected.domain}`} target="_blank" rel="noreferrer">Open domain <ExternalLink /></a></div><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => action("refresh")}>{busy === "refresh" ? <Loader2 className="animate-spin" /> : <RefreshCw />}Check DNS</Button></header>
          <div className="vxl-domain-steps"><div className={connected.vercelVerified ? "complete" : ""}>{connected.vercelVerified ? <Check /> : <Circle />}<span><strong>Ownership</strong><small>{connected.vercelVerified ? "Verified" : "Verification required"}</small></span></div><div className={connected.dnsConfigured ? "complete" : ""}>{connected.dnsConfigured ? <Check /> : <Circle />}<span><strong>DNS routing</strong><small>{connected.dnsConfigured ? "Configured" : "Waiting for records"}</small></span></div><div className={connected.status === "active" ? "complete" : ""}>{connected.status === "active" ? <Check /> : <Circle />}<span><strong>HTTPS portfolio</strong><small>{connected.status === "active" ? "Ready worldwide" : "Activates automatically"}</small></span></div></div>
          {(connected.verification.length > 0 || connected.dnsRecords.length > 0) && <div className="vxl-dns-table"><div><span>TYPE</span><span>HOST / DOMAIN</span><span>VALUE</span><span /></div>{[...connected.verification, ...connected.dnsRecords].map((record, index) => <div key={`${record.type}-${record.value}-${index}`}><strong>{record.type || "DNS"}</strong><code>{record.domain || record.name || connected.domain}</code><code>{record.value}</code><button type="button" onClick={() => copy(record.value || "")} aria-label="Copy DNS value">{copied === record.value ? <Check /> : <Copy />}</button></div>)}</div>}
          {connected.status !== "active" && <div className="vxl-domain-help"><AlertCircle /><div><strong>Add the records at your domain provider</strong><p>DNS changes can take time to spread. Keep your existing MX records untouched so domain email continues working, then return here and select Check DNS.</p></div></div>}
          {connected.lastCheckedAt && <p className="vxl-domain-checked">Last checked {new Date(connected.lastCheckedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>}
          <div className="vxl-domain-danger">{confirmRemove ? <div><div><strong>Disconnect {connected.domain}?</strong><p>Your portfolio remains available at thevxl.com/p/{connected.portfolioSlug}.</p></div><Button type="button" variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => setConfirmRemove(false)}><X />Cancel</Button><Button type="button" size="sm" disabled={Boolean(busy)} onClick={remove}>{busy === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />}Disconnect</Button></div> : <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}><Trash2 />Disconnect custom domain</Button>}</div>
        </div>
      )}
      {notice && <div className={`vxl-inline-notice mt-4 is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.tone === "error" ? <AlertCircle /> : <CheckCircle2 />}{notice.text}</div>}
    </section>
  );
}
