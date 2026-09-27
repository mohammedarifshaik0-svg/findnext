export const ADVANCED_ENGAGEMENT_ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_VXL_PHASE2_ANALYTICS !== "false";

export const ENGAGEMENT_EVENT_TYPES = [
  "showcase_view",
  "resume_download",
  "contact_click",
  "external_link_click",
  "evidence_open",
] as const;

export type EngagementEventType = typeof ENGAGEMENT_EVENT_TYPES[number];
export type EngagementTarget = { key: string; label: string };

type Row = Record<string, unknown>;

const object = (value: unknown): Row | null => value && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
const rows = (value: unknown) => Array.isArray(value) ? value.map(object).filter((row): row is Row => Boolean(row)) : [];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function isEngagementEventType(value: unknown): value is EngagementEventType {
  return typeof value === "string" && (ENGAGEMENT_EVENT_TYPES as readonly string[]).includes(value);
}

function safeExternalUrl(value: unknown) {
  const raw = text(value);
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function externalTargets(snapshot: Row) {
  const targets = new Map<string, EngagementTarget>();
  const add = (urlValue: unknown, labelValue: unknown) => {
    const url = safeExternalUrl(urlValue);
    if (!url) return;
    const label = text(labelValue) || url.hostname.replace(/^www\./, "");
    targets.set(url.href, { key: `external:${url.hostname.toLowerCase()}`, label: label.slice(0, 120) });
  };
  for (const item of rows(snapshot.items)) add(item.url, item.title);
  for (const section of rows(snapshot.customSections)) {
    for (const item of rows(section.items)) add(item.url, item.title);
  }
  for (const showcase of rows(snapshot.showcases)) {
    for (const link of rows(showcase.links)) add(link.url, link.label);
    for (const media of rows(showcase.media)) if (!text(media.assetId)) add(media.url, media.caption || media.name || media.alt);
  }
  return targets;
}

export function resolveEngagementTarget(snapshotValue: unknown, eventType: EngagementEventType, targetValue: unknown): EngagementTarget | null {
  const snapshot = object(snapshotValue);
  if (!snapshot) return null;
  const target = text(targetValue).slice(0, 2048);
  if (eventType === "contact_click") {
    return text(object(snapshot.profile)?.email) ? { key: "contact", label: "Contact" } : null;
  }
  if (eventType === "resume_download") {
    return object(snapshot.resume) ? { key: "resume", label: "Résumé download" } : null;
  }
  if (eventType === "external_link_click") return externalTargets(snapshot).get(target) ?? null;

  const showcases = rows(snapshot.showcases);
  if (eventType === "showcase_view") {
    const showcase = showcases.find((row) => text(row.slug) === target && row.is_enabled !== false);
    return showcase ? { key: `showcase:${target}`, label: (text(showcase.title) || "Showcase").slice(0, 120) } : null;
  }
  if (eventType === "evidence_open") {
    for (const showcase of showcases) {
      const showcaseKey = text(showcase.slug);
      for (const link of rows(showcase.links)) {
        if (text(link.id) === target) return { key: `evidence:${showcaseKey}:${target}`, label: (text(link.label) || "Evidence link").slice(0, 120) };
      }
      for (const media of rows(showcase.media)) {
        if (text(media.id) === target) return { key: `evidence:${showcaseKey}:${target}`, label: (text(media.caption) || text(media.name) || text(media.alt) || "Supporting evidence").slice(0, 120) };
      }
    }
  }
  return null;
}

export function engagementLabel(eventType: EngagementEventType) {
  return ({
    showcase_view: "Showcase opens",
    resume_download: "Résumé downloads",
    contact_click: "Contact clicks",
    external_link_click: "External link clicks",
    evidence_open: "Evidence opens",
  } satisfies Record<EngagementEventType, string>)[eventType];
}
