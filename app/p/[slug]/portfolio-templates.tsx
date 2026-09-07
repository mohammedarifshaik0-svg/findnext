import Image from "next/image";
import { ArrowDownToLine, ArrowUpRight, Mail, MapPin } from "lucide-react";
import { paletteFor, portfolioStyle } from "@/lib/portfolio-style";

type Row = Record<string, string | boolean | number | null>;
export type PortfolioData = { profile: Row; experiences: Row[]; education: Row[]; items: Row[] };

const value = (input: unknown) => typeof input === "string" ? input : "";
const lines = (input: unknown) => value(input).split("\n").map((line) => line.replace(/^[•\-]\s*/, "").trim()).filter(Boolean);
const years = (row: Row) => [value(row.start_date), value(row.end_date) || (row.is_current ? "Present" : "")].filter(Boolean).join(" — ");
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "FN";
const groups = (items: Row[]) => ({
  skills: items.filter((item) => item.item_type === "skill"),
  projects: items.filter((item) => item.item_type === "project"),
  achievements: items.filter((item) => item.item_type === "achievement"),
  links: items.filter((item) => item.item_type === "link" && item.url),
  extras: items.filter((item) => ["certification", "language"].includes(value(item.item_type))),
});

function PortfolioActions({ profile, tone = "light" }: { profile: Row; tone?: "light" | "dark" | "gold" }) {
  const slug = value(profile.portfolio_slug);
  const palette = tone === "dark" ? "border-white/15 bg-white/8 text-white hover:bg-white/14" : tone === "gold" ? "border-[#dfba86]/45 bg-[#dfba86] text-[#0a0f24] hover:bg-[#efd0a4]" : "border-black/10 bg-black text-white hover:bg-black/85";
  const secondary = tone === "dark" ? "border-white/15 text-white hover:bg-white/8" : tone === "gold" ? "border-[#dfba86]/35 text-[#dfba86] hover:bg-[#dfba86]/8" : "border-black/15 text-slate-950 hover:bg-black/5";
  return <div className="flex flex-wrap gap-3">
    {Boolean(profile.email) && <a className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${palette}`} href={`mailto:${value(profile.email)}`}><Mail className="h-4 w-4" />Contact</a>}
    {slug && <a className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${secondary}`} href={`/p/${slug}/resume`}><ArrowDownToLine className="h-4 w-4" />Download résumé</a>}
  </div>;
}

function ProfilePhoto({ profile, className, sizes }: { profile: Row; className: string; sizes: string }) {
  const slug = value(profile.portfolio_slug);
  if (!profile.photo_path || !slug) return null;
  return <Image src={`/p/${slug}/photo`} alt={`${value(profile.full_name)} portrait`} fill sizes={sizes} className={className} unoptimized />;
}

function ContactLine({ profile, mutedClass }: { profile: Row; mutedClass: string }) {
  return <div className={`flex flex-wrap gap-x-6 gap-y-2 text-sm ${mutedClass}`}>
    {Boolean(profile.city) && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{value(profile.city)}{profile.country ? `, ${value(profile.country)}` : ""}</span>}
    {Boolean(profile.email) && <a className="inline-flex items-center gap-2 hover:underline" href={`mailto:${value(profile.email)}`}><Mail className="h-4 w-4" />{value(profile.email)}</a>}
  </div>;
}

function ExternalLinks({ links, className }: { links: Row[]; className: string }) {
  if (!links.length) return null;
  return <div className="flex flex-wrap gap-x-5 gap-y-3">{links.map((link) => <a className={`inline-flex items-center gap-1.5 text-sm font-semibold ${className}`} key={value(link.id)} href={value(link.url)} target="_blank" rel="noreferrer">{value(link.title) || "Link"}<ArrowUpRight className="h-3.5 w-3.5" /></a>)}</div>;
}

function EditorialTemplate({ data }: { data: PortfolioData }) {
  const { profile, experiences, education, items } = data;
  const { skills, projects, achievements, links, extras } = groups(items);
  const name = value(profile.full_name);
  const palette = paletteFor("studio", value(profile.accent));
  return <main className="portfolio-surface min-h-screen overflow-hidden bg-[var(--portfolio-bg)] text-[var(--portfolio-text)] [font-family:'Avenir_Next','Helvetica_Neue',Arial,sans-serif]" style={portfolioStyle("studio", value(profile.accent), Number(profile.effect_intensity ?? 65), value(profile.text_tone))}>
    <div className="portfolio-atmosphere" />
    <div className="relative z-[1] h-1" style={{ backgroundColor: palette.colors[0] }} />
    <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-7 sm:px-10 lg:px-20">
      <a href="#top" className="text-xl italic text-[#dfba86] [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{name || "Portfolio"}</a>
      <div className="hidden items-center gap-8 text-xs font-semibold tracking-[.14em] text-[#8d96b0] md:flex"><a href="#story">STORY</a><a href="#experience">RECORD</a><a href="#work">WORK</a></div>
      {Boolean(profile.email) && <a href={`mailto:${value(profile.email)}`} className="rounded-full border border-[#dfba86]/50 px-5 py-2.5 text-xs font-semibold tracking-[.12em] text-[#dfba86]">CONTACT</a>}
    </nav>

    <header id="top" className="relative mx-auto max-w-[1440px] px-6 pb-24 pt-16 text-center sm:px-10 lg:px-20 lg:pb-36 lg:pt-24">
      <div className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(223,186,134,.12),transparent_68%)] blur-2xl" />
      <p className="relative text-xs font-semibold tracking-[.3em] text-[#dfba86]">A PROFESSIONAL STORY</p>
      <h1 className="relative mt-7 text-6xl font-light leading-[.88] tracking-[-.045em] sm:text-8xl lg:text-[8rem] [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{name}</h1>
      <p className="relative mt-6 text-xl italic text-[#dfba86] sm:text-3xl [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{value(profile.headline)}</p>

      <div className={`relative mt-14 overflow-hidden rounded-xl border border-[#dfba86]/20 bg-[#101735] text-left shadow-[0_40px_120px_rgba(0,0,0,.45)] ${profile.photo_path ? "grid lg:grid-cols-[1.35fr_.65fr]" : "grid lg:grid-cols-[.82fr_1.18fr]"}`}>
        <div className={`relative min-h-[360px] overflow-hidden ${profile.photo_path ? "bg-[#111833]" : "bg-[radial-gradient(circle_at_24%_20%,rgba(223,186,134,.35),transparent_25%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,.32),transparent_35%),linear-gradient(135deg,#0b1025,#171e42)]"}`}>
          <ProfilePhoto profile={profile} className="object-cover grayscale-[20%]" sizes="(max-width: 1024px) 100vw, 62vw" />
          {!profile.photo_path && <div className="absolute inset-0 grid place-items-center"><span className="text-[9rem] font-light text-[#dfba86]/65 [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{initials(name)}</span></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090e22]/70 via-transparent to-transparent" />
        </div>
        <div className="flex flex-col justify-center border-t border-[#dfba86]/15 bg-[#090e22]/75 p-8 backdrop-blur-xl sm:p-12 lg:border-l lg:border-t-0 lg:p-14">
          <p className="text-3xl font-light leading-tight sm:text-4xl [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">A career is more than a timeline. It is the record of what you changed.</p>
          <p className="mt-7 line-clamp-6 whitespace-pre-line text-base leading-8 text-[var(--portfolio-muted)]">{value(profile.professional_summary)}</p>
          <div className="mt-8"><PortfolioActions profile={profile} tone="gold" /></div>
        </div>
      </div>
    </header>

    <section id="story" className="border-y border-[#dfba86]/15 bg-[#0d1430] px-6 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.65fr_1.35fr]">
        <div><p className="text-xs font-semibold tracking-[.28em] text-[#dfba86]">01 / ORIENTATION</p><h2 className="mt-5 max-w-md text-5xl font-light leading-[1.02] [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">The work behind the person.</h2></div>
        <div><p className="whitespace-pre-line text-xl leading-9 text-[#e9e3df]">{value(profile.professional_summary)}</p><div className="mt-8"><ContactLine profile={profile} mutedClass="text-[#8d96b0]" /></div></div>
      </div>
    </section>

    {skills.length > 0 && <section className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-20 lg:py-32"><div className="text-center"><p className="text-xs font-semibold tracking-[.28em] text-[#dfba86]">02 / CAPABILITIES</p><h2 className="mt-4 text-5xl font-light [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">Areas of specialization</h2></div><div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{skills.map((skill, index) => <div key={value(skill.id)} className="group border border-[#dfba86]/16 bg-[#101735] p-7 transition hover:-translate-y-1 hover:border-[#dfba86]/45"><p className="text-[11px] tracking-[.18em] text-[#dfba86]">0{index + 1}</p><h3 className="mt-7 text-lg font-semibold">{value(skill.title)}</h3><div className="mt-5 h-px bg-gradient-to-r from-[#dfba86] to-transparent" /></div>)}</div></section>}

    {experiences.length > 0 && <section id="experience" className="bg-[#111a3d] px-6 py-24 sm:px-10 lg:px-20 lg:py-32"><div className="mx-auto max-w-7xl"><p className="text-xs font-semibold tracking-[.28em] text-[#dfba86]">03 / PROFESSIONAL RECORD</p><h2 className="mt-4 text-5xl font-light [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">The journey, in chapters</h2><div className="mt-14 divide-y divide-[#dfba86]/15 border-y border-[#dfba86]/15">{experiences.map((row, index) => <article key={value(row.id)} className="grid gap-7 py-10 lg:grid-cols-[180px_1fr]"><div><span className="text-xs tracking-[.12em] text-[#dfba86]">CHAPTER {String(index + 1).padStart(2, "0")}</span><p className="mt-3 text-sm text-[#8d96b0]">{years(row)}</p></div><div><p className="text-sm font-semibold tracking-[.08em] text-[#dfba86]">{value(row.company)}{row.location ? ` · ${value(row.location)}` : ""}</p><h3 className="mt-2 text-3xl font-light [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{value(row.role)}</h3>{Boolean(row.description) && <ul className="mt-5 grid gap-3 text-[#aab1c5]">{lines(row.description).map((line) => <li className="flex gap-3 leading-7" key={line}><span className="mt-3 h-px w-4 shrink-0 bg-[#dfba86]" />{line}</li>)}</ul>}</div></article>)}</div></div></section>}

    <section id="work" className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-20 lg:py-32">
      {projects.length > 0 && <><p className="text-xs font-semibold tracking-[.28em] text-[#dfba86]">04 / SELECTED WORK</p><h2 className="mt-4 text-5xl font-light [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">Ideas made tangible</h2><div className="mt-14 grid gap-6 md:grid-cols-3">{projects.map((project, index) => <article key={value(project.id)} className="overflow-hidden border border-[#dfba86]/15 bg-[#101735]"><div className="relative h-48 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(223,186,134,.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,.45),transparent_35%),#090e22]"><span className="absolute bottom-4 right-5 text-7xl font-light text-white/10 [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">0{index + 1}</span></div><div className="p-7"><p className="text-xs tracking-[.15em] text-[#dfba86]">{value(project.subtitle) || "PROJECT"}</p><h3 className="mt-3 text-2xl [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{value(project.title)}</h3><p className="mt-4 leading-7 text-[#8d96b0]">{value(project.description)}</p>{project.url && <a href={value(project.url)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-[#dfba86]">View project <ArrowUpRight className="h-4 w-4" /></a>}</div></article>)}</div></>}
      {achievements.length > 0 && <div className="mt-24 grid gap-5 md:grid-cols-2">{achievements.map((achievement) => <blockquote key={value(achievement.id)} className="border border-[#dfba86]/15 bg-[#0d1430] p-8 text-2xl italic leading-9 text-[#e9e3df] [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">“{value(achievement.title)}”</blockquote>)}</div>}
    </section>

    {(education.length > 0 || extras.length > 0) && <section className="border-y border-[#dfba86]/15 bg-[#0d1430] px-6 py-24 sm:px-10 lg:px-20"><div className="mx-auto max-w-7xl"><p className="text-xs font-semibold tracking-[.28em] text-[#dfba86]">05 / FOUNDATIONS</p><div className="mt-10 grid gap-5 md:grid-cols-2">{education.map((row) => <article key={value(row.id)} className="border border-[#dfba86]/15 bg-[#090e22] p-7"><p className="text-xs tracking-[.12em] text-[#dfba86]">{years(row)}</p><h3 className="mt-4 text-2xl [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{value(row.qualification)}</h3><p className="mt-2 text-[#8d96b0]">{value(row.institution)}</p></article>)}{extras.map((row) => <article key={value(row.id)} className="border border-[#dfba86]/15 bg-[#090e22] p-7"><p className="text-xs tracking-[.12em] text-[#dfba86]">{value(row.item_type).toUpperCase()}</p><h3 className="mt-4 text-2xl [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">{value(row.title)}</h3><p className="mt-2 text-[#8d96b0]">{value(row.subtitle)}</p></article>)}</div></div></section>}

    <footer className="px-6 py-24 text-center sm:px-10 lg:py-32"><p className="text-xs font-semibold tracking-[.28em] text-[#dfba86]">A CONVERSATION STARTS HERE</p><h2 className="mx-auto mt-5 max-w-3xl text-5xl font-light leading-tight sm:text-6xl [font-family:'Iowan_Old_Style','Baskerville',Georgia,serif]">Let’s build what comes next.</h2><div className="mt-9 flex justify-center"><PortfolioActions profile={profile} tone="gold" /></div><div className="mt-12 flex justify-center"><ExternalLinks links={links} className="text-[#8d96b0] hover:text-[#dfba86]" /></div><p className="mt-16 text-xs text-[#59617a]">Made with FindNext</p></footer>
  </main>;
}

function PrismTemplate({ data }: { data: PortfolioData }) {
  const { profile, experiences, education, items } = data;
  const { skills, projects, achievements, links } = groups(items);
  const name = value(profile.full_name);
  return <main className="portfolio-surface min-h-screen overflow-hidden bg-[var(--portfolio-bg)] text-[var(--portfolio-text)] [font-family:'Avenir_Next','Helvetica_Neue',Arial,sans-serif]" style={portfolioStyle("canvas", value(profile.accent), Number(profile.effect_intensity ?? 65), value(profile.text_tone))}>
    <div className="portfolio-atmosphere" />
    <header className="relative isolate px-6 pb-24 pt-28 text-center sm:px-10 lg:px-20 lg:pb-36 lg:pt-40">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(124,58,237,.38),transparent_38%),radial-gradient(ellipse_at_18%_80%,rgba(13,148,136,.23),transparent_36%),radial-gradient(ellipse_at_82%_75%,rgba(236,72,153,.2),transparent_35%),linear-gradient(#030305,#0b0b16_50%,#08060e)]" />
      <p className="text-xs font-semibold uppercase tracking-[.26em] text-slate-400">Professional portfolio</p>
      <h1 className="mx-auto mt-7 max-w-6xl text-6xl font-black leading-[.88] tracking-[-.065em] sm:text-8xl lg:text-[8.5rem]">{name}</h1>
      <p className="mx-auto mt-7 max-w-4xl text-xl font-light text-slate-300 sm:text-3xl">{value(profile.headline)}</p>
      <div className="mx-auto mt-9 h-1 w-44 rounded-full bg-gradient-to-r from-teal-400 via-violet-500 to-pink-500" />
      <div className="mt-10 flex justify-center"><PortfolioActions profile={profile} tone="dark" /></div>
      {profile.photo_path && <div className="relative mx-auto mt-16 aspect-[16/7] max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_40px_140px_rgba(124,58,237,.28)]"><ProfilePhoto profile={profile} className="object-cover" sizes="(max-width: 1024px) 92vw, 1024px" /><div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent" /></div>}
    </header>

    <nav className="sticky top-0 z-20 border-y border-white/10 bg-[#050508]/80 px-6 py-5 backdrop-blur-2xl sm:px-10 lg:px-20"><div className="mx-auto flex max-w-7xl items-center justify-between"><span className="text-lg font-black">{initials(name)} / FN</span><div className="hidden gap-7 text-sm text-slate-400 md:flex"><a href="#identity">About</a><a href="#trajectory">Experience</a><a href="#systems">Projects</a><a href="#contact">Contact</a></div><ExternalLinks links={links} className="text-slate-300 hover:text-white" /></div></nav>

    <section id="identity" className="relative border-b border-white/8 px-6 py-24 sm:px-10 lg:px-20 lg:py-32"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(13,148,136,.12),transparent_30%)]" /><div className="relative mx-auto max-w-7xl"><p className="bg-gradient-to-r from-teal-400 via-violet-400 to-pink-400 bg-clip-text text-xs font-bold uppercase tracking-[.25em] text-transparent">01 / Identity</p><h2 className="mt-4 max-w-4xl text-4xl font-bold tracking-[-.035em] sm:text-6xl">A career built through clarity, curiosity and measurable change.</h2><div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1fr]"><blockquote className="border-l-4 border-violet-500 pl-7 text-3xl font-light leading-snug sm:text-4xl">“The strongest work turns complexity into momentum.”</blockquote><div><p className="whitespace-pre-line text-lg leading-8 text-slate-400">{value(profile.professional_summary)}</p><div className="mt-7"><ContactLine profile={profile} mutedClass="text-slate-500" /></div></div></div></div></section>

    {skills.length > 0 && <section className="relative px-6 py-24 sm:px-10 lg:px-20 lg:py-32"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(236,72,153,.1),transparent_28%)]" /><div className="relative mx-auto max-w-7xl"><p className="bg-gradient-to-r from-teal-400 via-violet-400 to-pink-400 bg-clip-text text-xs font-bold uppercase tracking-[.25em] text-transparent">02 / Capability</p><h2 className="mt-4 text-4xl font-bold tracking-[-.035em] sm:text-5xl">The toolkit behind the outcomes</h2><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{skills.map((skill, index) => <article key={value(skill.id)} className={`rounded-2xl border border-white/10 p-6 shadow-2xl ${index % 3 === 0 ? "bg-gradient-to-br from-teal-500/20 to-blue-500/5" : index % 3 === 1 ? "bg-gradient-to-br from-violet-500/20 to-pink-500/5" : "bg-gradient-to-br from-slate-500/15 to-emerald-500/5"}`}><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">{value(skill.title)}</h3><span className="text-xs text-slate-500">0{index + 1}</span></div><div className="mt-7 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full w-[78%] bg-gradient-to-r from-teal-400 via-violet-500 to-pink-500" /></div></article>)}</div></div></section>}

    {experiences.length > 0 && <section id="trajectory" className="border-y border-white/8 bg-[radial-gradient(circle_at_82%_28%,rgba(236,72,153,.16),transparent_32%),linear-gradient(180deg,#08060e,#0d0710)] px-6 py-24 sm:px-10 lg:px-20 lg:py-32"><div className="mx-auto max-w-7xl"><p className="bg-gradient-to-r from-teal-400 via-violet-400 to-pink-400 bg-clip-text text-xs font-bold uppercase tracking-[.25em] text-transparent">03 / Trajectory</p><h2 className="mt-4 text-4xl font-bold tracking-[-.035em] sm:text-5xl">Professional chapters</h2><div className="relative mt-14 space-y-12 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-gradient-to-b before:from-teal-400 before:via-violet-500 before:to-pink-500">{experiences.map((row) => <article key={value(row.id)} className="relative grid gap-4 pl-10 lg:grid-cols-[190px_1fr]"><span className="absolute left-0 top-2 h-3.5 w-3.5 rounded-full border-4 border-[#0d0710] bg-violet-400 shadow-[0_0_25px_rgba(167,139,250,.8)]" /><p className="text-sm text-slate-500">{years(row)}</p><div><h3 className="text-2xl font-semibold">{value(row.role)}</h3><p className="mt-1 text-violet-300">{value(row.company)}{row.location ? ` · ${value(row.location)}` : ""}</p>{Boolean(row.description) && <ul className="mt-5 space-y-3 text-slate-400">{lines(row.description).map((line) => <li className="leading-7" key={line}>{line}</li>)}</ul>}</div></article>)}</div></div></section>}

    {projects.length > 0 && <section id="systems" className="px-6 py-24 sm:px-10 lg:px-20 lg:py-32"><div className="mx-auto max-w-7xl"><p className="bg-gradient-to-r from-teal-400 via-violet-400 to-pink-400 bg-clip-text text-xs font-bold uppercase tracking-[.25em] text-transparent">04 / Systems built</p><h2 className="mt-4 text-4xl font-bold tracking-[-.035em] sm:text-5xl">Ideas turned into working proof</h2><div className="mt-12 grid gap-6 md:grid-cols-3">{projects.map((project, index) => <article key={value(project.id)} className={`relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 p-7 ${index % 3 === 0 ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-700" : index % 3 === 1 ? "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-300" : "bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-700"}`}><div className="absolute inset-0 bg-[linear-gradient(130deg,transparent,rgba(255,255,255,.22),transparent)] opacity-60" /><p className="relative text-xs font-bold uppercase tracking-[.18em] text-white/70">{value(project.subtitle) || `Case study 0${index + 1}`}</p><h3 className="relative mt-20 text-3xl font-bold">{value(project.title)}</h3><p className="relative mt-5 leading-7 text-white/80">{value(project.description)}</p>{project.url && <a className="relative mt-7 inline-flex items-center gap-2 font-semibold" href={value(project.url)} target="_blank" rel="noreferrer">Explore <ArrowUpRight className="h-4 w-4" /></a>}</article>)}</div></div></section>}

    {achievements.length > 0 && <section className="relative border-y border-white/8 px-6 py-24 text-center sm:px-10 lg:px-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,.24),transparent_55%)]" /><div className="relative mx-auto max-w-4xl"><span className="bg-gradient-to-r from-teal-400 via-violet-400 to-pink-400 bg-clip-text text-6xl font-black text-transparent">“</span>{achievements.map((achievement) => <p key={value(achievement.id)} className="mt-4 text-2xl font-light leading-9 text-slate-200 sm:text-3xl">{value(achievement.title)}</p>)}</div></section>}

    {education.length > 0 && <section className="px-6 py-24 sm:px-10 lg:px-20"><div className="mx-auto max-w-7xl"><p className="bg-gradient-to-r from-teal-400 via-violet-400 to-pink-400 bg-clip-text text-xs font-bold uppercase tracking-[.25em] text-transparent">05 / Foundations</p><div className="mt-10 grid gap-4 md:grid-cols-2">{education.map((row) => <article key={value(row.id)} className="border border-white/10 bg-white/[.025] p-7"><p className="text-xs text-slate-500">{years(row)}</p><h3 className="mt-4 text-xl font-semibold">{value(row.qualification)}</h3><p className="mt-2 text-slate-400">{value(row.institution)}</p></article>)}</div></div></section>}

    <footer id="contact" className="relative px-6 py-28 text-center sm:px-10 lg:py-40"><div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(13,148,136,.18),transparent_30%),radial-gradient(circle_at_75%_50%,rgba(236,72,153,.18),transparent_30%)]" /><div className="relative"><p className="text-xs uppercase tracking-[.25em] text-slate-500">The next chapter</p><h2 className="mx-auto mt-5 max-w-3xl text-5xl font-black tracking-[-.045em] sm:text-7xl">Let’s make it matter.</h2><div className="mt-9 flex justify-center"><PortfolioActions profile={profile} tone="dark" /></div><p className="mt-16 text-xs text-slate-700">Made with FindNext</p></div></footer>
  </main>;
}

function ZenTemplate({ data }: { data: PortfolioData }) {
  const { profile, experiences, education, items } = data;
  const { skills, projects, achievements, links } = groups(items);
  const name = value(profile.full_name);
  return <main className="portfolio-surface min-h-screen bg-[var(--portfolio-bg)] text-[var(--portfolio-text)] [font-family:'Helvetica_Neue',Arial,sans-serif]" style={portfolioStyle("ledger", value(profile.accent), Number(profile.effect_intensity ?? 65), value(profile.text_tone))}>
    <div className="portfolio-atmosphere" />
    <nav className="flex items-center justify-between border-b border-[#1c1c1f] px-6 py-7 sm:px-10 lg:px-20"><span className="text-sm font-semibold lowercase">{name} · portfolio</span><ExternalLinks links={links} className="text-[#7e7e86] hover:text-white" /></nav>
    <header className={`grid min-h-[720px] border-b border-[#1c1c1f] ${profile.photo_path ? "lg:grid-cols-[1fr_.62fr]" : ""}`}>
      <div className="flex flex-col justify-center px-6 py-24 sm:px-10 lg:px-20"><p className="text-xs tracking-[.25em] text-[#829579]">[ PROFILE / ACTIVE ]</p><h1 className="mt-7 max-w-5xl text-6xl font-bold leading-[.95] tracking-[-.055em] sm:text-8xl">{value(profile.headline) || name}</h1>{value(profile.headline) && <p className="mt-8 text-xl text-[#7e7e86]">{name}</p>}<p className="mt-10 max-w-3xl whitespace-pre-line text-lg leading-8 text-[#8b8b93]">{value(profile.professional_summary)}</p><div className="mt-9"><PortfolioActions profile={profile} tone="dark" /></div></div>
      {profile.photo_path && <div className="relative min-h-[480px] overflow-hidden border-t border-[#1c1c1f] lg:border-l lg:border-t-0"><ProfilePhoto profile={profile} className="object-cover grayscale" sizes="(max-width: 1024px) 100vw, 40vw" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" /></div>}
    </header>

    <section className="grid border-b border-[#1c1c1f] px-6 py-20 sm:px-10 lg:grid-cols-[240px_1fr] lg:gap-20 lg:px-20 lg:py-28"><p className="text-xs tracking-[.2em] text-[#829579]">01 / ORIENTATION</p><div><p className="max-w-4xl text-2xl leading-10">“Good work removes noise until the contribution becomes unmistakable.”</p><div className="mt-6 max-w-3xl whitespace-pre-line text-base leading-8 text-[#7e7e86]">{value(profile.professional_summary)}</div></div></section>

    {skills.length > 0 && <section className="grid border-b border-[#1c1c1f] px-6 py-20 sm:px-10 lg:grid-cols-[240px_1fr] lg:gap-20 lg:px-20 lg:py-28"><p className="text-xs tracking-[.2em] text-[#829579]">02 / CAPABILITY</p><div className="divide-y divide-[#1c1c1f] border-y border-[#1c1c1f]">{skills.map((skill, index) => <div key={value(skill.id)} className="flex items-center justify-between gap-5 py-5"><span className="text-sm font-medium">{value(skill.title)}</span><span className="text-xs text-[#525258]">{String(index + 1).padStart(2, "0")}</span></div>)}</div></section>}

    {projects.length > 0 && <section className="border-b border-[#1c1c1f] py-24"><div className="px-6 sm:px-10 lg:px-20"><p className="text-xs tracking-[.2em] text-[#829579]">03 / SELECTED WORK</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.04em]">Artifacts with a reason to exist</h2></div><div className="mt-12 divide-y divide-[#1c1c1f] border-y border-[#1c1c1f]">{projects.map((project, index) => <article key={value(project.id)} className="group grid items-center gap-8 px-6 py-12 transition hover:bg-[#080808] sm:px-10 lg:grid-cols-[1fr_.72fr] lg:px-20"><div><p className="text-xs text-[#829579]">{value(project.subtitle) || `Project ${String(index + 1).padStart(2, "0")}`}</p><h3 className="mt-3 text-3xl font-semibold">{value(project.title)}</h3><p className="mt-5 max-w-xl leading-7 text-[#7e7e86]">{value(project.description)}</p>{project.url && <a className="mt-6 inline-flex items-center gap-2 text-sm underline underline-offset-4" href={value(project.url)} target="_blank" rel="noreferrer">View project <ArrowUpRight className="h-4 w-4" /></a>}</div><div className="relative h-48 overflow-hidden border border-[#1c1c1f] bg-[linear-gradient(135deg,#0c0c0d,#020202)]"><div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#202024_1px,transparent_1px),linear-gradient(90deg,#202024_1px,transparent_1px)] [background-size:28px_28px]" /><span className="absolute bottom-5 right-6 text-7xl font-bold text-white/[.06]">0{index + 1}</span></div></article>)}</div></section>}

    {experiences.length > 0 && <section className="grid border-b border-[#1c1c1f] px-6 py-20 sm:px-10 lg:grid-cols-[240px_1fr] lg:gap-20 lg:px-20 lg:py-28"><p className="text-xs tracking-[.2em] text-[#829579]">04 / CHRONOLOGY</p><div className="space-y-12">{experiences.map((row) => <article key={value(row.id)} className="grid gap-4 sm:grid-cols-[150px_1fr]"><p className="text-sm text-[#55555c]">{years(row)}</p><div><h3 className="text-xl font-semibold">{value(row.company)} <span className="font-normal text-[#7e7e86]">/ {value(row.role)}</span></h3>{Boolean(row.description) && <ul className="mt-4 space-y-2 text-sm leading-7 text-[#7e7e86]">{lines(row.description).map((line) => <li key={line}>{line}</li>)}</ul>}</div></article>)}</div></section>}

    {achievements.length > 0 && <section className="grid border-b border-[#1c1c1f] px-6 py-20 sm:px-10 lg:grid-cols-[240px_1fr] lg:gap-20 lg:px-20 lg:py-28"><p className="text-xs tracking-[.2em] text-[#829579]">05 / SIGNALS</p><div className="space-y-8">{achievements.map((achievement) => <p key={value(achievement.id)} className="max-w-4xl text-2xl leading-10">{value(achievement.title)}</p>)}</div></section>}

    {education.length > 0 && <section className="grid border-b border-[#1c1c1f] px-6 py-20 sm:px-10 lg:grid-cols-[240px_1fr] lg:gap-20 lg:px-20 lg:py-28"><p className="text-xs tracking-[.2em] text-[#829579]">06 / FOUNDATION</p><div className="grid gap-10 md:grid-cols-2">{education.map((row) => <article key={value(row.id)}><p className="text-xs text-[#55555c]">{years(row)}</p><h3 className="mt-3 text-xl font-semibold">{value(row.qualification)}</h3><p className="mt-2 text-sm text-[#7e7e86]">{value(row.institution)}</p></article>)}</div></section>}

    <footer className="px-6 py-28 text-center sm:px-10 lg:py-36"><p className="text-xs tracking-[.2em] text-[#829579]">07 / CONNECTION</p><h2 className="mt-6 break-words text-4xl font-semibold tracking-[-.04em] sm:text-6xl">{value(profile.email)}</h2><p className="mt-4 text-sm text-[#55555c]">A simple hello is enough to begin.</p><div className="mt-9 flex justify-center"><PortfolioActions profile={profile} tone="dark" /></div><p className="mt-20 text-xs text-[#2d2d32]">Made with FindNext</p></footer>
  </main>;
}

export function PortfolioTemplate({ data }: { data: PortfolioData }) {
  const theme = value(data.profile.theme);
  if (theme === "canvas") return <PrismTemplate data={data} />;
  if (theme === "ledger") return <ZenTemplate data={data} />;
  return <EditorialTemplate data={data} />;
}
