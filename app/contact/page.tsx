import type { Metadata } from "next";
import { ContactForm } from "./contact-form";
import { LegalFooter, PublicInfoHeader } from "@/app/legal-shell";

export const metadata: Metadata = { title: "Contact VXL | VXL", description: "Contact VXL about accounts, access plans, payments, refunds, privacy or technical support.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return <main className="min-h-screen bg-[#f5f5f7] text-[#111113]"><PublicInfoHeader/><section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[.7fr_1.3fr] md:py-20"><div><p className="text-[11px] font-bold tracking-[.18em] text-zinc-500">VXL · SUPPORT</p><h1 className="mt-4 text-5xl font-bold tracking-[-.06em]">We&apos;d love to help.</h1><p className="mt-5 max-w-md text-sm leading-7 text-zinc-600">For questions about VXL accounts, access plans, payments, refunds, privacy or technical issues, send us a message here.</p><div className="mt-8 rounded-xl border border-black/10 bg-white p-5 text-sm"><p className="text-xs font-bold uppercase tracking-[.14em] text-zinc-400">Official support email</p><a className="mt-2 inline-block font-semibold underline underline-offset-4" href="mailto:hello@thevxl.com">hello@thevxl.com</a><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-zinc-400">Website</p><p className="mt-2 font-semibold">www.thevxl.com</p></div></div><ContactForm/></section><LegalFooter/></main>;
}
