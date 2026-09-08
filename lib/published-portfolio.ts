import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PortfolioData } from "@/app/p/[slug]/portfolio-templates";

type ResumeSnapshot = {
  storage_path: string;
  original_name: string;
  content_type: string;
};

type Snapshot = PortfolioData & { resume?: ResumeSnapshot | null };

export type PortfolioAccess = {
  data: PortfolioData;
  resume: ResumeSnapshot | null;
  profileId: string;
  isOwner: boolean;
};

const activeAfter = (value: unknown) =>
  typeof value === "string" && new Date(value).getTime() > Date.now();

async function viewerId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

export async function loadPortfolioAccess(slug: string): Promise<PortfolioAccess | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const [accountId, admin] = await Promise.all([
    viewerId(),
    Promise.resolve(createAdminClient()),
  ]);

  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("portfolio_slug", normalizedSlug)
    .maybeSingle();

  if (ownerProfile && accountId === ownerProfile.id) {
    const [experiences, education, items, resume] = await Promise.all([
      admin.from("experiences").select("*").eq("profile_id", accountId).order("sort_order"),
      admin.from("education").select("*").eq("profile_id", accountId).order("sort_order"),
      admin.from("profile_items").select("*").eq("profile_id", accountId).order("sort_order"),
      admin.from("resumes").select("storage_path,original_name,content_type").eq("profile_id", accountId).eq("is_primary", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      data: {
        profile: ownerProfile,
        experiences: experiences.data ?? [],
        education: education.data ?? [],
        items: items.data ?? [],
      } as PortfolioData,
      resume: resume.data,
      profileId: String(ownerProfile.id),
      isOwner: true,
    };
  }

  const { data: published } = await admin
    .from("published_portfolios")
    .select("profile_id,snapshot_json,is_public")
    .eq("slug", normalizedSlug)
    .maybeSingle();
  if (!published?.is_public) return null;

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    admin.from("profiles").select("trial_ends_at").eq("id", published.profile_id).maybeSingle(),
    admin.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id", published.profile_id).maybeSingle(),
  ]);
  const paid = ["live", "flex", "care"].includes(String(subscription?.plan))
    && subscription?.status === "active"
    && activeAfter(subscription.period_ends_at);
  if (!paid && !activeAfter(profile?.trial_ends_at)) return null;

  const snapshot = published.snapshot_json as Snapshot;
  if (!snapshot?.profile || !Array.isArray(snapshot.experiences) || !Array.isArray(snapshot.education) || !Array.isArray(snapshot.items)) return null;
  return {
    data: snapshot,
    resume: snapshot.resume ?? null,
    profileId: String(published.profile_id),
    isOwner: false,
  };
}
