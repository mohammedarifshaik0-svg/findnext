import { paletteFor, portfolioStyle } from "@/lib/portfolio-style";

type PreviewData = {
  fullName: string;
  headline: string;
  professionalSummary: string;
  theme: string;
  accent: string;
  textTone: string;
  effectIntensity: number;
  photoPath?: string | null;
  portfolioSlug?: string;
  experiences: Array<{ id: string; role: string; company: string }>;
  education: Array<{ id: string; institution: string; qualification: string }>;
  items: Array<{ id: string; itemType: string; title: string; subtitle?: string; description?: string }>;
};

const skills = (data: PreviewData) => data.items.filter((item) => item.itemType === "skill").slice(0, 4);
const projects = (data: PreviewData) => data.items.filter((item) => item.itemType === "project" && item.title).slice(0, 3);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "YN";

export function PortfolioMiniPreview({ data, showWordmark = true }: { data: PreviewData; showWordmark?: boolean }) {
  const palette = paletteFor(data.theme, data.accent);
  const style = portfolioStyle(data.theme, data.accent, data.effectIntensity, data.textTone);
  const atmosphere = {
    backgroundImage: `radial-gradient(circle at 50% 8%, ${palette.colors[1]}88, transparent 34%), radial-gradient(circle at 0% 75%, ${palette.colors[0]}55, transparent 32%), radial-gradient(circle at 100% 70%, ${palette.colors[2]}55, transparent 32%)`,
    opacity: Math.max(0.08, data.effectIntensity / 100),
  };
  const focusStyle = style;
  if (["canvas", "mono-chrome", "mono-glass"].includes(data.theme))
    return (
      <div className="relative min-h-[1350px] overflow-hidden bg-[var(--portfolio-bg)] p-7 text-[var(--portfolio-text)]" style={focusStyle}>
        <div className="absolute inset-0" style={atmosphere} />
        <div className="relative text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-slate-400">Professional portfolio</p>
          <h2 className="mt-5 text-5xl font-black leading-[.88] tracking-[-.06em]">{data.fullName || "Your name"}</h2>
          <p className="mt-4 text-xs text-slate-300">{data.headline || "Professional headline"}</p>
          <div className="mx-auto mt-5 h-0.5 w-20 bg-gradient-to-r from-teal-400 via-violet-500 to-pink-500" />
        </div>
        <div className="relative mt-12 border-t border-white/10 pt-7">
          <p className="bg-gradient-to-r from-teal-400 to-pink-400 bg-clip-text text-[9px] font-bold uppercase tracking-[.2em] text-transparent">01 / Identity</p>
          <p className="mt-3 text-xl font-bold leading-tight">Clarity, curiosity and measurable change.</p>
          <p className="mt-4 line-clamp-4 text-xs leading-5 text-slate-400">{data.professionalSummary || "Your professional story will appear here."}</p>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-2">
          {skills(data).map((skill, index) => (
            <div key={skill.id} className="rounded-lg border border-white/10 p-3" style={{ backgroundColor: `${palette.colors[index % 3]}22` }}>
              <p className="text-[10px] font-semibold">{skill.title}</p>
              <div
                className="mt-3 h-0.5"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${palette.colors[0]}, ${palette.colors[2]})`,
                }}
              />
            </div>
          ))}
        </div>
        {projects(data).length > 0 && <div className="relative mt-10 border-t border-white/10 pt-7"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-teal-300">Selected work</p><div className="mt-4 grid gap-2">{projects(data).map((project, index) => <div key={project.id} className="rounded-lg border border-white/10 bg-white/5 p-3"><span className="text-[8px] text-slate-500">0{index + 1}</span><p className="mt-1 text-xs font-semibold">{project.title}</p>{project.subtitle && <p className="mt-1 text-[9px] text-slate-400">{project.subtitle}</p>}</div>)}</div></div>}
        <div className="relative mt-8">
          <p className="text-[9px] font-bold uppercase tracking-[.2em] text-violet-300">Trajectory</p>
          {data.experiences.slice(0, 2).map((row) => (
            <div key={row.id} className="mt-4 border-l border-violet-400/50 pl-4">
              <p className="text-xs font-semibold">{row.role || "Role"}</p>
              <p className="mt-1 text-[10px] text-slate-500">{row.company || "Company"}</p>
            </div>
          ))}
        </div>
        <div className="relative mt-12 border-t border-white/10 pt-7">
          <p className="text-[9px] font-bold uppercase tracking-[.2em] text-teal-300">Education</p>
          {data.education.slice(0, 2).map((row) => (
            <div key={row.id} className="mt-4">
              <p className="text-xs font-semibold">{row.qualification || "Qualification"}</p>
              <p className="mt-1 text-[10px] text-slate-500">{row.institution || "Institution"}</p>
            </div>
          ))}
        </div>
        {showWordmark && <p className="relative mt-20 text-center text-[9px] text-[var(--portfolio-muted)]">Made with VXL</p>}
      </div>
    );

  if (["ledger", "mono-brutalist", "mono-editorial", "mono-paper"].includes(data.theme))
    return (
      <div className="relative min-h-[1350px] overflow-hidden bg-[var(--portfolio-bg)] p-7 text-[var(--portfolio-text)]" style={focusStyle}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 85% 12%, ${palette.colors[0]}33, transparent 30%)`,
            opacity: data.effectIntensity / 100,
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--portfolio-text)_18%,transparent)] pb-5">
            <p className="text-[10px] font-semibold lowercase">{data.fullName || "your name"} · portfolio</p>
            <span className="text-[9px] text-[var(--portfolio-accent)]">active</span>
          </div>
          <p className="mt-14 text-[9px] tracking-[.2em] text-[var(--portfolio-accent)]">[ PROFILE / ACTIVE ]</p>
          <h2 className="mt-5 text-4xl font-bold leading-[.95] tracking-[-.055em]">{data.headline || data.fullName || "Professional story"}</h2>
          {data.headline && <p className="mt-4 text-xs text-[var(--portfolio-muted)]">{data.fullName}</p>}
          <p className="mt-7 line-clamp-5 text-xs leading-5 text-[var(--portfolio-muted)]">{data.professionalSummary || "Your professional story will appear here."}</p>
          <div className="mt-12 grid grid-cols-[75px_1fr] gap-5 border-y border-[color:color-mix(in_srgb,var(--portfolio-text)_18%,transparent)] py-7">
            <p className="text-[8px] tracking-[.16em] text-[var(--portfolio-accent)]">CAPABILITY</p>
            <div>
              {skills(data).map((skill, index) => (
                <div key={skill.id} className="flex justify-between border-b border-[color:color-mix(in_srgb,var(--portfolio-text)_18%,transparent)] py-2 first:pt-0">
                  <span className="text-[10px]">{skill.title}</span>
                  <span className="text-[8px] text-[var(--portfolio-muted)]">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          {projects(data).length > 0 && <div className="mt-10 border-t border-[color:color-mix(in_srgb,var(--portfolio-text)_18%,transparent)] pt-7"><p className="text-[8px] tracking-[.16em] text-[var(--portfolio-accent)]">SELECTED WORK</p>{projects(data).map((project, index) => <div key={project.id} className="mt-4 grid grid-cols-[45px_1fr] gap-3 border-b border-[color:color-mix(in_srgb,var(--portfolio-text)_12%,transparent)] pb-4"><span className="text-[8px] text-[var(--portfolio-muted)]">0{index + 1}</span><div><p className="text-xs font-semibold">{project.title}</p>{project.subtitle && <p className="mt-1 text-[9px] text-[var(--portfolio-muted)]">{project.subtitle}</p>}</div></div>)}</div>}
          <div className="mt-9">
            <p className="text-[8px] tracking-[.16em] text-[var(--portfolio-accent)]">CHRONOLOGY</p>
            {data.experiences.slice(0, 2).map((row) => (
              <div key={row.id} className="mt-4 grid grid-cols-[1fr_2fr] gap-3">
                <p className="text-[9px] text-[var(--portfolio-muted)]">record</p>
                <div>
                  <p className="text-xs font-semibold">{row.company || "Company"}</p>
                  <p className="text-[10px] text-[var(--portfolio-muted)]">{row.role || "Role"}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 border-t border-[color:color-mix(in_srgb,var(--portfolio-text)_18%,transparent)] pt-7">
            <p className="text-[8px] tracking-[.16em] text-[var(--portfolio-accent)]">EDUCATION</p>
            {data.education.slice(0, 2).map((row) => (
              <div key={row.id} className="mt-4 grid grid-cols-[1fr_2fr] gap-3">
                <p className="text-[9px] text-[var(--portfolio-muted)]">study</p>
                <div>
                  <p className="text-xs font-semibold">{row.qualification || "Qualification"}</p>
                  <p className="text-[10px] text-[var(--portfolio-muted)]">{row.institution || "Institution"}</p>
                </div>
              </div>
            ))}
          </div>
          {showWordmark && <p className="mt-20 text-center text-[9px] text-[var(--portfolio-muted)]">Made with VXL</p>}
        </div>
      </div>
    );

  return (
    <div className="relative min-h-[1350px] overflow-hidden bg-[var(--portfolio-bg)] p-7 text-[var(--portfolio-text)] [font-family:Georgia,serif]" style={focusStyle}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 8%, ${palette.colors[0]}44, transparent 30%), radial-gradient(circle at 90% 65%, ${palette.colors[1]}44, transparent 32%)`,
          opacity: data.effectIntensity / 100,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="italic text-[#dfba86]">{data.fullName || "Portfolio"}</p>
          <span className="rounded-full border border-[#dfba86]/30 px-3 py-1 text-[8px] tracking-[.14em] text-[#dfba86]">CONTACT</span>
        </div>
        <div className="mt-14 text-center">
          <p className="text-[8px] tracking-[.25em] text-[#dfba86]">A PROFESSIONAL STORY</p>
          <h2 className="mt-5 text-5xl font-light leading-[.88] tracking-[-.04em]">{data.fullName || "Your name"}</h2>
          <p className="mt-4 text-sm italic text-[#dfba86]">{data.headline || "Professional headline"}</p>
        </div>
        <div className="mt-10 grid min-h-48 grid-cols-[.8fr_1.2fr] overflow-hidden rounded-lg border border-[#dfba86]/15 bg-[#101735]">
          <div className="grid place-items-center bg-[radial-gradient(circle_at_20%_20%,rgba(223,186,134,.35),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,.35),transparent_40%),#111833]">
            <span className="text-5xl text-[#dfba86]/60">{initials(data.fullName)}</span>
          </div>
          <div className="flex flex-col justify-center bg-[#090e22]/70 p-5">
            <p className="text-base leading-tight">The record of what you changed.</p>
            <p className="mt-4 line-clamp-4 text-[10px] leading-4 text-[#8d96b0]">{data.professionalSummary || "Your professional story will appear here."}</p>
          </div>
        </div>
        {projects(data).length > 0 && <div className="mt-10"><p className="text-[8px] tracking-[.2em] text-[#dfba86]">02 / SELECTED WORK</p>{projects(data).map((project, index) => <div key={project.id} className="mt-4 grid grid-cols-[70px_1fr] border-t border-[#dfba86]/10 pt-3"><p className="text-[8px] text-[#dfba86]">PR. 0{index + 1}</p><div><p className="text-xs">{project.title}</p>{project.subtitle && <p className="mt-1 text-[9px] text-[#8d96b0]">{project.subtitle}</p>}</div></div>)}</div>}
        <div className="mt-10">
          <p className="text-[8px] tracking-[.2em] text-[#dfba86]">03 / PROFESSIONAL RECORD</p>
          {data.experiences.slice(0, 2).map((row, index) => (
            <div key={row.id} className="mt-4 grid grid-cols-[70px_1fr] border-t border-[#dfba86]/10 pt-3">
              <p className="text-[8px] text-[#dfba86]">CH. 0{index + 1}</p>
              <div>
                <p className="text-xs">{row.role || "Role"}</p>
                <p className="mt-1 text-[9px] text-[#8d96b0]">{row.company || "Company"}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-[#dfba86]/10 pt-7">
          <p className="text-[8px] tracking-[.2em] text-[#dfba86]">04 / EDUCATION</p>
          {data.education.slice(0, 2).map((row) => (
            <div key={row.id} className="mt-4">
              <p className="text-xs">{row.qualification || "Qualification"}</p>
              <p className="mt-1 text-[9px] text-[#8d96b0]">{row.institution || "Institution"}</p>
            </div>
          ))}
        </div>
        {showWordmark && <p className="mt-20 text-center text-[9px] text-[var(--portfolio-muted)]">Made with VXL</p>}
      </div>
    </div>
  );
}
