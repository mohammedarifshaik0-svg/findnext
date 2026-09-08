import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PortfolioTemplate, type PortfolioData } from "./portfolio-templates";

export const dynamic = "force-dynamic";

async function getPortfolio(slug: string): Promise<PortfolioData | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = typeof authData?.claims?.sub === "string" ? authData.claims.sub : null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("portfolio_slug", slug).maybeSingle();
  if (!profile) return null;
  const id = String(profile.id);
  const [experiences, education, items, subscription] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", id).order("sort_order"),
    supabase.from("education").select("*").eq("profile_id", id).order("sort_order"),
    supabase.from("profile_items").select("*").eq("profile_id", id).order("sort_order"),
    supabase.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id", id).maybeSingle(),
  ]);
  const isPaid = ["live", "flex", "care"].includes(String(subscription.data?.plan)) && subscription.data?.status === "active" && typeof subscription.data.period_ends_at === "string" && new Date(subscription.data.period_ends_at).getTime() > Date.now();
  const trialActive = typeof profile.trial_ends_at === "string" && new Date(profile.trial_ends_at).getTime() > Date.now();
  const isOwnerPreview = userId === id;
  if (!isOwnerPreview && (!profile.is_public || (!isPaid && !trialActive))) return null;
  return { profile, experiences: experiences.data ?? [], education: education.data ?? [], items: items.data ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPortfolio(slug);
  if (!data) return { title: "Portfolio unavailable — VXL" };
  return { title: `${data.profile.full_name} — ${data.profile.headline || "Portfolio"}`, description: String(data.profile.professional_summary || "Professional portfolio on VXL").slice(0, 160) };
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPortfolio(slug);
  if (!data) return <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white"><div className="max-w-md text-center"><p className="text-sm font-semibold uppercase tracking-[.2em] text-indigo-300">VXL</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.04em]">This portfolio isn’t available.</h1><p className="mt-4 leading-7 text-slate-400">The owner may still be reviewing it, or its access period may have ended.</p></div></main>;
  return <PortfolioTemplate data={data} />;
}
