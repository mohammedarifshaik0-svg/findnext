import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

type Snapshot = {
  profile?: { full_name?: string; headline?: string; theme?: string };
  experiences?: unknown[];
  education?: unknown[];
  items?: Array<{ item_type?: string }>;
  showcases?: unknown[];
  customSections?: unknown[];
};

const privateJson = (body: unknown, init?: ResponseInit) => Response.json(body, {
  ...init,
  headers: {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Vary": "Cookie",
    ...init?.headers,
  },
});

async function auth() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: typeof data?.claims?.sub === "string" ? data.claims.sub : null };
}

const activeUntil = (status: unknown, endsAt: unknown) => status === "active"
  && typeof endsAt === "string"
  && new Date(endsAt).getTime() > Date.now();

export async function GET(request: Request) {
  const { supabase, userId } = await auth();
  if (!userId) return privateJson({ error: "Sign in to view versions." }, { status: 401 });
  const admin = createAdminClient();

  const [{ data: subscription, error: subscriptionError }, { data: published, error: publishedError }] = await Promise.all([
    supabase.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id", userId).maybeSingle(),
    admin.from("published_portfolios").select("version_number").eq("profile_id", userId).maybeSingle(),
  ]);
  if (subscriptionError || publishedError) return privateJson({ error: "Version history is temporarily unavailable." }, { status: 503 });

  const active = activeUntil(subscription?.status, subscription?.period_ends_at);
  const plan = active && ["trial", "live", "flex", "care"].includes(String(subscription?.plan)) ? String(subscription?.plan) : "free";
  const retentionDays = plan === "care" ? 365 : plan === "flex" ? 90 : plan === "live" || plan === "trial" ? 0 : null;
  const latestOnly = plan === "trial" || plan === "live";
  const requestedPage = Math.max(0, Math.min(20, Number.parseInt(new URL(request.url).searchParams.get("page") ?? "0", 10) || 0));
  const page = latestOnly ? 0 : requestedPage;
  const pageSize = latestOnly ? 1 : 20;

  if (retentionDays === null) {
    return privateJson({ plan, available: false, retentionDays: null, latestOnly: false, versions: [], page: 0, hasMore: false, total: 0 });
  }

  let query = supabase
    .from("profile_revisions")
    .select("id,created_at,snapshot_json", { count: "exact" })
    .eq("profile_id", userId)
    .eq("change_type", "portfolio_published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (retentionDays > 0) query = query.gte("created_at", new Date(Date.now() - retentionDays * 86_400_000).toISOString());
  query = query.range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return privateJson({ error: "Version history is temporarily unavailable." }, { status: 503 });
  const currentVersion = Math.max(0, Number(published?.version_number) || 0);
  const versions = (data ?? []).map((row, index) => {
    const snapshot = row.snapshot_json as Snapshot;
    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    const position = page * pageSize + index;
    return {
      id: row.id,
      createdAt: row.created_at,
      versionNumber: currentVersion ? Math.max(1, currentVersion - position) : null,
      isCurrent: position === 0,
      fullName: snapshot?.profile?.full_name ?? "Portfolio",
      headline: snapshot?.profile?.headline ?? "Published portfolio",
      theme: snapshot?.profile?.theme ?? "studio",
      counts: {
        experiences: Array.isArray(snapshot?.experiences) ? snapshot.experiences.length : 0,
        education: Array.isArray(snapshot?.education) ? snapshot.education.length : 0,
        projects: items.filter((item) => item.item_type === "project").length,
        skills: items.filter((item) => item.item_type === "skill").length,
        showcases: Array.isArray(snapshot?.showcases) ? snapshot.showcases.length : 0,
        customSections: Array.isArray(snapshot?.customSections) ? snapshot.customSections.length : 0,
      },
    };
  });
  return privateJson({
    plan,
    available: true,
    retentionDays,
    latestOnly,
    versions,
    page,
    hasMore: (page + 1) * pageSize < (count ?? 0),
    total: count ?? versions.length,
  });
}

export async function POST(request: Request) {
  const { supabase, userId } = await auth();
  if (!userId) return privateJson({ error: "Sign in to restore a version." }, { status: 401 });
  const limited = await checkRateLimit(userId, "version_restore");
  if (limited) return limited;

  const { revisionId } = await request.json().catch(() => ({})) as { revisionId?: string };
  if (!revisionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(revisionId)) {
    return privateJson({ error: "Choose a valid portfolio version." }, { status: 400 });
  }
  const { data, error } = await supabase.rpc("restore_my_portfolio_revision", { revision_id: revisionId });
  if (error) {
    const message = error.message.includes("active VXL plan") ? "An active VXL plan is required to restore versions."
      : error.message.includes("90-day") || error.message.includes("one-year") || error.message.includes("latest published") ? error.message
        : "This portfolio version could not be restored.";
    return privateJson({ error: message }, { status: 400 });
  }
  return privateJson(data);
}
