import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BriefcaseBusiness, GraduationCap, Mail, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

async function getPortfolio(slug: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("portfolio_slug", slug).eq("is_public", true).maybeSingle();
  if (!profile) return null;
  const id = String(profile.id);
  const [experiences, education, items, subscription] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", id).order("sort_order"),
    supabase.from("education").select("*").eq("profile_id", id).order("sort_order"),
    supabase.from("profile_items").select("*").eq("profile_id", id).order("sort_order"),
    supabase.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id", id).maybeSingle(),
  ]);
  const isPaid = subscription.data?.plan === "live" || subscription.data?.plan === "premium";
  const trialActive = typeof profile.trial_ends_at === "string" && new Date(profile.trial_ends_at).getTime() > Date.now();
  if (!isPaid && !trialActive) return null;
  return { profile, experiences: experiences.data ?? [], education: education.data ?? [], items: items.data ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const data = await getPortfolio(slug);
  if (!data) return { title: "Portfolio unavailable — FindNext" };
  return { title: `${data.profile.full_name} — ${data.profile.headline || "Portfolio"}`, description: String(data.profile.professional_summary || "Professional portfolio on FindNext").slice(0, 160) };
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const data = await getPortfolio(slug);
  if (!data) return <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white"><div className="max-w-md text-center"><p className="text-sm font-semibold uppercase tracking-[.2em] text-indigo-300">FindNext</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.04em]">This portfolio isn’t live.</h1><p className="mt-4 leading-7 text-slate-400">It may still be in review or its access period may have ended.</p></div></main>;
  const { profile, experiences, education, items } = data;
  const skills = items.filter((item) => item.item_type === "skill"); const projects = items.filter((item) => item.item_type === "project"); const links = items.filter((item) => item.item_type === "link");
  return <main className="min-h-screen bg-[#f7f8fc] text-slate-950"><div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-400" /><div className="mx-auto max-w-6xl px-6 py-12 sm:py-20"><header className="grid gap-8 border-b border-slate-200 pb-12 md:grid-cols-[1fr_auto] md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-indigo-600">Portfolio</p><h1 className="mt-5 text-5xl font-semibold tracking-[-.05em] sm:text-7xl">{String(profile.full_name)}</h1><p className="mt-4 text-xl text-slate-500 sm:text-2xl">{String(profile.headline || "Professional")}</p></div><div className="space-y-2 text-sm text-slate-600">{profile.city && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{String(profile.city)}{profile.country ? `, ${profile.country}` : ""}</p>}{profile.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{String(profile.email)}</p>}</div></header><section className="grid gap-10 py-12 md:grid-cols-[.7fr_1.3fr]"><h2 className="text-sm font-semibold uppercase tracking-[.18em] text-slate-400">About</h2><p className="max-w-3xl text-xl leading-9 text-slate-700">{String(profile.professional_summary || "Profile details coming soon.")}</p></section>{experiences.length > 0 && <PortfolioSection icon={BriefcaseBusiness} label="Experience">{experiences.map((row) => <article key={String(row.id)} className="portfolio-row"><div><p className="font-semibold">{String(row.company)}</p><p className="mt-1 text-sm text-slate-500">{String(row.start_date)}{row.end_date ? ` — ${row.end_date}` : ""}</p></div><div><h3 className="text-xl font-semibold">{String(row.role)}</h3><p className="mt-3 leading-7 text-slate-600">{String(row.description)}</p></div></article>)}</PortfolioSection>}{education.length > 0 && <PortfolioSection icon={GraduationCap} label="Education">{education.map((row) => <article key={String(row.id)} className="portfolio-row"><div><p className="font-semibold">{String(row.institution)}</p><p className="mt-1 text-sm text-slate-500">{String(row.end_date)}</p></div><div><h3 className="text-xl font-semibold">{String(row.qualification)}</h3><p className="mt-2 text-slate-600">{String(row.field)}{row.grade ? ` · ${row.grade}` : ""}</p></div></article>)}</PortfolioSection>}{skills.length > 0 && <section className="border-t border-slate-200 py-12"><p className="text-sm font-semibold uppercase tracking-[.18em] text-slate-400">Skills</p><div className="mt-6 flex flex-wrap gap-3">{skills.map((skill) => <span key={String(skill.id)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm">{String(skill.title)}</span>)}</div></section>}{projects.length > 0 && <PortfolioSection icon={BriefcaseBusiness} label="Selected projects">{projects.map((row) => <article key={String(row.id)} className="portfolio-row"><div><p className="font-semibold">{String(row.subtitle)}</p></div><div><h3 className="text-xl font-semibold">{String(row.title)}</h3><p className="mt-3 leading-7 text-slate-600">{String(row.description)}</p></div></article>)}</PortfolioSection>}<footer className="flex flex-col gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Made with FindNext</p><div className="flex gap-5">{links.map((link) => <a className="font-semibold text-indigo-600" key={String(link.id)} href={String(link.url)}>{String(link.title)}</a>)}</div></footer></div></main>;
}

function PortfolioSection({ icon: Icon, label, children }: { icon: typeof BriefcaseBusiness; label: string; children: React.ReactNode }) { return <section className="border-t border-slate-200 py-12"><p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.18em] text-slate-400"><Icon className="h-4 w-4" />{label}</p><div className="mt-8 divide-y divide-slate-200">{children}</div></section>; }
