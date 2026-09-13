import Link from "next/link";
import { VxlLogo } from "@/app/vxl-logo";
import { CookiePreferencesButton } from "@/app/vxl-analytics";

export type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[] };

export function PublicInfoHeader() {
  return <header className="vxl-info-header sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/10 bg-white/85 px-5 backdrop-blur-xl md:px-12"><Link href="/" aria-label="VXL home"><VxlLogo /></Link><Link href="/" className="text-xs font-semibold text-zinc-500 hover:text-black">Back to VXL</Link></header>;
}

export function LegalShell({ title, effective = "Effective Date: 13 September 2026", intro, sections }: { title: string; effective?: string; intro: string[]; sections: LegalSection[] }) {
  return <main className="min-h-screen bg-[#f5f5f7] text-[#111113]"><PublicInfoHeader/><article className="mx-auto max-w-3xl px-5 py-14 md:py-20"><p className="text-[11px] font-bold tracking-[.18em] text-zinc-500">VXL · LEGAL</p><h1 className="mt-4 text-4xl font-bold tracking-[-.055em] md:text-6xl">{title}</h1><p className="mt-5 inline-flex rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-zinc-600">{effective}</p><div className="mt-10 space-y-5 text-[15px] leading-7 text-zinc-600">{intro.map((p) => <p key={p}>{p}</p>)}</div><div className="mt-12 space-y-10">{sections.map((section, index) => <section key={section.title} className="border-t border-black/10 pt-8"><h2 className="text-xl font-bold tracking-[-.025em]"><span className="mr-3 text-zinc-400">{index + 1}.</span>{section.title}</h2><div className="mt-4 space-y-4 text-[15px] leading-7 text-zinc-600">{section.paragraphs?.map((p) => <p key={p}>{p}</p>)}{section.bullets && <ul className="list-disc space-y-2 pl-5">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}</div></section>)}</div></article><LegalFooter/></main>;
}

export function LegalFooter() {
  return <footer className="border-t border-black/10 bg-[#0b0b0d] px-5 py-10 text-zinc-400"><div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_auto_auto]"><div><VxlLogo/><p className="mt-2 text-xs">We Excel. We Grow Together.</p></div><nav className="grid grid-cols-1 gap-8 text-xs sm:grid-cols-2" aria-label="Footer"><div className="flex flex-col gap-3"><strong className="text-[10px] tracking-[.16em] text-zinc-500">VXL</strong><Link href="/about">About Us</Link><Link href="/#pricing">Pricing</Link><Link href="/contact">Contact Us</Link></div><div className="flex flex-col items-start gap-3"><strong className="text-[10px] tracking-[.16em] text-zinc-500">LEGAL</strong><Link href="/terms">Terms &amp; Conditions</Link><Link href="/privacy">Privacy Policy</Link><Link href="/refund-policy">Refund &amp; Cancellation Policy</Link><CookiePreferencesButton className="text-left hover:text-white"/></div></nav><small className="text-xs md:text-right">© 2026 VXL. All rights reserved.</small></div></footer>;
}
