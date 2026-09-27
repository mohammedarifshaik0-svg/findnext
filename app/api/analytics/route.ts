import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADVANCED_ENGAGEMENT_ANALYTICS_ENABLED,
  engagementLabel,
  isEngagementEventType,
  resolveEngagementTarget,
  type EngagementEventType,
} from "@/lib/portfolio-engagement";

const ANALYTICS_RANGES = [14, 30, 90, 365] as const;

type AnalyticsRow = {
  viewed_at: string;
  visitor_hash: string;
  referrer_domain: string | null;
  device_class: string;
};

type EngagementRow = {
  event_type: EngagementEventType;
  target_key: string;
  target_label: string | null;
  visitor_hash: string;
  occurred_at: string;
};

function countBy<T>(values: T[], key: (value: T) => string) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const name = key(value);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function requestContext(request: Request, profileId: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = createHash("sha256").update(`${profileId}:${day}:${forwarded}:${userAgent}`).digest("hex");
  let referrerDomain: string | null = null;
  try {
    const referrer = request.headers.get("referer");
    if (referrer) {
      const host = new URL(referrer).hostname;
      if (host !== request.headers.get("host") && !host.endsWith("thevxl.com")) referrerDomain = host.slice(0, 120);
    }
  } catch {
    // Invalid referrers are ignored rather than stored.
  }
  const deviceClass = /ipad|tablet/i.test(userAgent)
    ? "tablet"
    : /mobile|android|iphone/i.test(userAgent)
      ? "mobile"
      : /mozilla|chrome|safari|firefox/i.test(userAgent)
        ? "desktop"
        : "other";
  return { visitorHash, referrerDomain, deviceClass };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return Response.json({ error: "Sign in to view analytics." }, { status: 401 });

  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan,status,period_ends_at")
    .eq("profile_id", userId)
    .maybeSingle();
  const active = subscription?.status === "active" && new Date(subscription.period_ends_at ?? 0).getTime() > Date.now();
  const detailed = active && (subscription.plan === "flex" || subscription.plan === "care");
  const advancedEngagement = detailed && ADVANCED_ENGAGEMENT_ANALYTICS_ENABLED;
  const historyDays = subscription?.plan === "care" ? 365 : 90;
  const availableRanges = detailed ? ANALYTICS_RANGES.filter((days) => days <= historyDays) : [];
  const requestedDays = Number(new URL(request.url).searchParams.get("days"));
  const rangeDays = availableRanges.includes(requestedDays as typeof ANALYTICS_RANGES[number]) ? requestedDays : 14;
  const since = new Date(Date.now() - rangeDays * 86400000).toISOString();

  const detailQuery = detailed
    ? admin.from("portfolio_views").select("viewed_at,visitor_hash,referrer_domain,device_class").eq("profile_id", userId).gte("viewed_at", since).order("viewed_at")
    : Promise.resolve({ data: [] as AnalyticsRow[], error: null });
  const engagementQuery = advancedEngagement
    ? admin.from("portfolio_engagement_events").select("event_type,target_key,target_label,visitor_hash,occurred_at").eq("profile_id", userId).gte("occurred_at", since).order("occurred_at")
    : Promise.resolve({ data: [] as EngagementRow[], error: null });
  const [totalResult, detailResult, engagementResult] = await Promise.all([
    admin.from("portfolio_views").select("id", { count: "exact", head: true }).eq("profile_id", userId),
    detailQuery,
    engagementQuery,
  ]);
  if (totalResult.error || detailResult.error || engagementResult.error) {
    return Response.json({ error: "Analytics are temporarily unavailable." }, { status: 503 });
  }

  const viewRows = (detailResult.data ?? []) as AnalyticsRow[];
  const engagementRows = (engagementResult.data ?? []) as EngagementRow[];
  const days = countBy(viewRows, (row) => String(row.viewed_at).slice(0, 10));
  const visitors = new Set(viewRows.map((row) => row.visitor_hash));
  const engagedVisitors = new Set(engagementRows.map((row) => row.visitor_hash));
  const sources = countBy(viewRows, (row) => row.referrer_domain || "Direct");
  const devices = countBy(viewRows, (row) => row.device_class);
  const actions = countBy(engagementRows, (row) => row.event_type).map(([eventType, count]) => ({
    eventType,
    label: engagementLabel(eventType as EngagementEventType),
    count,
  }));
  const showcases = countBy(engagementRows.filter((row) => row.event_type === "showcase_view"), (row) => row.target_label || "Showcase");
  const topContent = countBy(
    engagementRows.filter((row) => row.event_type === "evidence_open" || row.event_type === "external_link_click"),
    (row) => row.target_label || "Portfolio link",
  );
  const engagementRate = visitors.size ? Math.round((engagedVisitors.size / visitors.size) * 100) : 0;

  return Response.json({
    plan: active ? subscription?.plan ?? "free" : "free",
    totalViews: totalResult.count ?? 0,
    detailed,
    advancedFeatureAvailable: ADVANCED_ENGAGEMENT_ANALYTICS_ENABLED,
    advancedEngagement,
    historyDays: detailed ? historyDays : null,
    rangeDays: detailed ? rangeDays : null,
    availableRanges,
    uniqueVisitors: detailed ? visitors.size : null,
    days: detailed ? days.map(([date, views]) => ({ date, views })) : [],
    sources: detailed ? sources.slice(0, 5).map(([source, views]) => ({ source, views })) : [],
    devices: detailed ? devices.map(([device, views]) => ({ device, views })) : [],
    engagement: advancedEngagement ? {
      totalActions: engagementRows.length,
      engagementRate,
      actions,
      showcases: showcases.slice(0, 5).map(([title, views]) => ({ title, views })),
      topContent: topContent.slice(0, 5).map(([title, opens]) => ({ title, opens })),
    } : null,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { slug?: unknown; eventType?: unknown; target?: unknown };
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!slug || slug.length > 80) return Response.json({ ok: true });
  const admin = createAdminClient();
  const { data: portfolio } = await admin
    .from("published_portfolios")
    .select("profile_id,is_public,snapshot_json")
    .eq("slug", slug)
    .maybeSingle();
  if (!portfolio?.is_public) return Response.json({ ok: true });

  const context = requestContext(request, String(portfolio.profile_id));
  if (!body.eventType || body.eventType === "portfolio_view") {
    await admin.from("portfolio_views").insert({
      profile_id: portfolio.profile_id,
      visitor_hash: context.visitorHash,
      referrer_domain: context.referrerDomain,
      device_class: context.deviceClass,
    });
    return Response.json({ ok: true });
  }
  if (!ADVANCED_ENGAGEMENT_ANALYTICS_ENABLED || !isEngagementEventType(body.eventType)) return Response.json({ ok: true });
  const target = resolveEngagementTarget(portfolio.snapshot_json, body.eventType, body.target);
  if (!target) return Response.json({ ok: true });
  await admin.from("portfolio_engagement_events").upsert({
    profile_id: portfolio.profile_id,
    event_type: body.eventType,
    target_key: target.key,
    target_label: target.label,
    visitor_hash: context.visitorHash,
    referrer_domain: context.referrerDomain,
    device_class: context.deviceClass,
  }, { onConflict: "profile_id,visitor_hash,event_type,target_key,event_day", ignoreDuplicates: true });
  return Response.json({ ok: true });
}
