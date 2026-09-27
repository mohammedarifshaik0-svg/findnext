import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, ImageIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";
import { loadPortfolioAccess } from "@/lib/published-portfolio";
import { normalizeAdvancedCustomization, type PortfolioShowcase, type ShowcaseLink, type ShowcaseMedia } from "@/lib/phase2-showcases";
import { PortfolioViewTracker } from "@/app/portfolio-view-tracker";

export const dynamic = "force-dynamic";

const getPortfolio = cache(async (slug: string) => loadPortfolioAccess(slug));
const text = (value: unknown) => typeof value === "string" ? value : "";
const paragraphs = (value: unknown) => text(value).split("\n").map((line) => line.trim()).filter(Boolean);

function findShowcase(data: Awaited<ReturnType<typeof getPortfolio>>, slug: string) {
  return data?.data.showcases?.find((row) => row.slug === slug && row.is_enabled) as PortfolioShowcase | undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; showcaseSlug: string }> }): Promise<Metadata> {
  const route = await params;
  const portfolio = await getPortfolio(route.slug);
  const showcase = findShowcase(portfolio, route.showcaseSlug);
  if (!portfolio || !showcase) return { title: "Project unavailable — VXL" };
  return { title: `${showcase.title} — ${text(portfolio.data.profile.full_name)}`, description: showcase.summary.slice(0, 160) };
}

export default async function ShowcasePage({ params }: { params: Promise<{ slug: string; showcaseSlug: string }> }) {
  const route = await params;
  const portfolio = await getPortfolio(route.slug);
  const showcase = findShowcase(portfolio, route.showcaseSlug);
  if (!portfolio || !showcase) notFound();
  const links = Array.isArray(showcase.links) ? showcase.links as ShowcaseLink[] : [];
  const media = Array.isArray(showcase.media) ? showcase.media as ShowcaseMedia[] : [];
  const owner = text(portfolio.data.profile.full_name);
  const presentation = normalizeAdvancedCustomization(portfolio.data.profile.advanced_customization).showcaseStyle;
  const basePath = (await headers()).get("x-vxl-custom-domain") ? "" : `/p/${route.slug}`;
  return (
    <main className={`vxl-showcase-detail is-${presentation} min-h-screen bg-[#08090c] text-[#f5f5f4]`}>
      {!portfolio.isOwner && <PortfolioViewTracker slug={route.slug} showcaseSlug={route.showcaseSlug} />}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7 sm:px-10">
        <a className="inline-flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white" href={basePath || "/"}><ArrowLeft className="h-4 w-4" />Back to {owner || "portfolio"}</a>
        <span className="text-xs font-semibold tracking-[.2em] text-violet-300">{portfolio.showWordmark ? "VXL SHOWCASE" : "PROJECT SHOWCASE"}</span>
      </nav>
      <article>
        <header className="border-y border-white/10 bg-[radial-gradient(circle_at_75%_20%,rgba(124,58,237,.24),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(34,211,238,.12),transparent_28%)] px-6 py-20 sm:px-10 lg:py-28">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Project case study</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-7xl">{showcase.title}</h1>
            {showcase.summary && <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">{showcase.summary}</p>}
            {links.length > 0 && <div className="mt-9 flex flex-wrap gap-3">{links.map((link) => <a key={link.id} href={link.url} data-vxl-evidence-id={link.id} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-5 text-sm font-semibold transition hover:bg-white/14">{link.label || "View evidence"}<ArrowUpRight className="h-4 w-4" /></a>)}</div>}
          </div>
        </header>
        <div className="vxl-showcase-body mx-auto grid max-w-5xl gap-14 px-6 py-20 sm:px-10 lg:py-28">
          {(["challenge", "approach", "outcome"] as const).map((section, index) => showcase[section] ? <section key={section} className="grid gap-5 border-t border-white/10 pt-8 md:grid-cols-[160px_1fr]"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">0{index + 1} {section}</p><div className="space-y-5 text-lg leading-8 text-zinc-300">{paragraphs(showcase[section]).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section> : null)}
          {media.length > 0 && <section className="vxl-showcase-gallery border-t border-white/10 pt-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Evidence gallery</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{media.map((item, index) => {
            const assetUrl = item.assetId ? `${basePath}/showcase/${route.showcaseSlug}/asset/${item.assetId}` : item.url;
            if (item.assetId && item.kind === "image") return <figure key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]"><div className="relative aspect-[4/3]"><Image src={assetUrl} alt={item.alt || `Project screenshot ${index + 1}`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" unoptimized /></div>{(item.caption || item.alt) && <figcaption className="p-4"><strong className="block text-sm">{item.caption || `Project screenshot ${index + 1}`}</strong>{item.alt && <span className="mt-1 block text-xs text-zinc-400">{item.alt}</span>}</figcaption>}</figure>;
            return <a key={item.id} href={assetUrl} data-vxl-evidence-id={item.id} target="_blank" rel="noreferrer" className="group flex min-h-40 flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/[.025] p-6 transition hover:-translate-y-1 hover:border-violet-300/40"><ImageIcon className="h-7 w-7 text-violet-300" /><div><strong className="block">{item.name || item.caption || `Supporting evidence ${index + 1}`}</strong><span className="mt-2 block text-sm text-zinc-400">{item.alt || (item.kind === "document" ? "Download the supporting PDF" : "Open the supporting image")}</span></div></a>;
          })}</div></section>}
        </div>
      </article>
    </main>
  );
}
