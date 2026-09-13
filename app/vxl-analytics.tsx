"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ANALYTICS_CONSENT_KEY, PENDING_AUTH_EVENT_KEY, type AnalyticsConsent, queueAuthEvent, trackEvent, updateAnalyticsConsent } from "@/lib/analytics";

export function CookiePreferencesButton({ className = "" }: { className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("vxl:open-cookie-settings"))}>Cookie settings</button>;
}

export function VxlAnalytics({ gaId }: { gaId?: string }) {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const productionHost = ready && (window.location.hostname === "www.thevxl.com" || window.location.hostname === "thevxl.com");

  useEffect(() => {
    const saved = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (saved === "granted" || saved === "denied") updateAnalyticsConsent(saved);

    const url = new URL(window.location.href);
    const event = url.searchParams.get("vxl_auth_event");
    const method = url.searchParams.get("vxl_auth_method");
    if ((event === "sign_up" || event === "login") && (method === "google" || method === "email")) {
      queueAuthEvent(event, method);
      url.searchParams.delete("vxl_auth_event");
      url.searchParams.delete("vxl_auth_method");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }

    const open = () => setSettingsOpen(true);
    window.addEventListener("vxl:open-cookie-settings", open);
    const frame = window.requestAnimationFrame(() => {
      if (saved === "granted" || saved === "denied") setConsent(saved);
      setReady(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("vxl:open-cookie-settings", open);
    };
  }, []);

  useEffect(() => {
    if (consent !== "granted") return;
    const raw = window.sessionStorage.getItem(PENDING_AUTH_EVENT_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { event?: "sign_up" | "login"; method?: "google" | "email" };
      if (pending.event && pending.method) trackEvent(pending.event, { auth_method: pending.method, source: "authentication" });
    } finally {
      window.sessionStorage.removeItem(PENDING_AUTH_EVENT_KEY);
    }
  }, [consent]);

  const choose = (next: AnalyticsConsent) => {
    updateAnalyticsConsent(next);
    setConsent(next);
    setSettingsOpen(false);
    if (next === "denied") window.sessionStorage.removeItem(PENDING_AUTH_EVENT_KEY);
  };

  const showBanner = productionHost && gaId && (consent === null || settingsOpen);

  return <>
    {productionHost && gaId && consent === "granted" && <GoogleAnalytics gaId={gaId} />}
    {showBanner && <aside className="vxl-cookie-consent" role="dialog" aria-modal={settingsOpen ? "true" : undefined} aria-labelledby="vxl-cookie-title">
      <div>
        <strong id="vxl-cookie-title">Your privacy, your choice.</strong>
        <p>VXL uses optional Google Analytics to understand product usage and improve the experience. Essential account and portfolio features work either way. No résumé text, profile content or contact details are sent to Google.</p>
        <a href="/privacy">Privacy policy</a>
      </div>
      <div className="vxl-cookie-actions">
        <button type="button" className="vxl-cookie-reject" onClick={() => choose("denied")}>Reject analytics</button>
        <button type="button" className="vxl-cookie-accept" onClick={() => choose("granted")}>Accept analytics</button>
      </div>
    </aside>}
  </>;
}
