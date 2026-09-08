import type { Metadata } from "next";
import { cache } from "react";
import { loadPortfolioAccess } from "@/lib/published-portfolio";
import { PortfolioTemplate, type PortfolioData } from "./portfolio-templates";

export const dynamic = "force-dynamic";

const getPortfolio = cache(async (slug: string): Promise<PortfolioData | null> =>
  (await loadPortfolioAccess(slug))?.data ?? null
);

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
