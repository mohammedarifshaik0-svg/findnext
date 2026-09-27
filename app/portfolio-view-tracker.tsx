"use client";

import { useEffect } from "react";
import type { EngagementEventType } from "@/lib/portfolio-engagement";

type TrackedEvent = EngagementEventType | "portfolio_view";

function postEvent(slug: string, eventType: TrackedEvent, target = "") {
  const key = `vxl-engagement:${slug}:${eventType}:${target}:${new Date().toISOString().slice(0, 10)}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, eventType, target }),
    keepalive: true,
  });
}

export function PortfolioViewTracker({ slug, showcaseSlug }: { slug: string; showcaseSlug?: string }) {
  useEffect(() => {
    postEvent(slug, "portfolio_view");
    if (showcaseSlug) postEvent(slug, "showcase_view", showcaseSlug);
  }, [showcaseSlug, slug]);

  useEffect(() => {
    const trackClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const evidenceId = anchor.dataset.vxlEvidenceId;
      if (evidenceId) {
        postEvent(slug, "evidence_open", evidenceId);
        return;
      }
      const href = anchor.href;
      if (!href) return;
      if (href.startsWith("mailto:")) {
        postEvent(slug, "contact_click");
        return;
      }
      try {
        const url = new URL(href);
        if (url.pathname.endsWith("/resume")) {
          postEvent(slug, "resume_download");
          return;
        }
        if (url.origin !== window.location.origin) postEvent(slug, "external_link_click", url.href);
      } catch {
        // Non-URL actions and local hash links are intentionally ignored.
      }
    };
    document.addEventListener("click", trackClick, { capture: true });
    return () => document.removeEventListener("click", trackClick, { capture: true });
  }, [slug]);

  return null;
}
