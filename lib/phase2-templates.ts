export const PHASE_2_TEMPLATES_ENABLED = process.env.NEXT_PUBLIC_VXL_PHASE2_TEMPLATES === "true";

export const corePortfolioTemplates = [
  { id: "studio", name: "Editorial", description: "Deep navy, champagne details and an elegant career narrative.", mood: "Refined · Story-led", swatch: "from-[#090e22] via-[#1a234c] to-[#dfba86]" },
  { id: "canvas", name: "Prism", description: "Cinematic gradients, luminous depth and high-energy project stories.", mood: "Bold · Expressive", swatch: "from-[#050508] via-violet-700 to-pink-500" },
  { id: "ledger", name: "Zen", description: "Pure black, disciplined typography and quietly confident structure.", mood: "Minimal · Precise", swatch: "from-black via-[#171719] to-[#829579]" },
  { id: "mono-brutalist", name: "Mono Brutalist", description: "High-contrast type, hard edges and unapologetic technical energy.", mood: "Direct · High-impact", swatch: "from-white via-zinc-100 to-black" },
  { id: "mono-chrome", name: "Mono Chrome", description: "Polished silver gradients and cinematic system-level depth.", mood: "Premium · Technical", swatch: "from-[#f5f5f7] via-[#6b6b70] to-[#09090b]" },
  { id: "mono-editorial", name: "Mono Editorial", description: "Elegant serif hierarchy with a rigorous monochrome grid.", mood: "Editorial · Structured", swatch: "from-[#111] via-[#1c1c1c] to-[#777]" },
  { id: "mono-glass", name: "Mono Glass", description: "Layered translucent surfaces with cool, confident elevation.", mood: "Soft · Dimensional", swatch: "from-[#1f2937] via-[#4b5563] to-[#9ca3af]" },
  { id: "mono-paper", name: "Mono Paper", description: "Warm white space, restrained shadows and crafted editorial rhythm.", mood: "Quiet · Tactile", swatch: "from-[#fffdfa] via-[#e7e5e4] to-[#a8a29e]" },
] as const;

export const phase2PortfolioTemplates = [
  { id: "p2-signal", name: "Signal", description: "A live career operating system with status rails, proof cards and electric data energy.", mood: "System · Electric", swatch: "from-[#05080f] via-[#1239ff] to-[#b8ff36]" },
  { id: "p2-orbit", name: "Orbit", description: "A cinematic, spatial portfolio that turns your identity and work into a luminous constellation.", mood: "Spatial · Cinematic", swatch: "from-[#070318] via-[#6d28d9] to-[#fb7185]" },
  { id: "p2-archive", name: "Archive", description: "A sharp Swiss index with catalog numbers, redline details and museum-grade restraint.", mood: "Swiss · Curated", swatch: "from-[#f2efe7] via-[#ff4d00] to-[#161616]" },
  { id: "p2-kinetic", name: "Kinetic", description: "An oversized poster system with punchy blocks, moving type energy and fearless hierarchy.", mood: "Poster · Unmissable", swatch: "from-[#ffe600] via-[#ff3d81] to-[#111111]" },
] as const;

export const portfolioTemplates = [
  ...corePortfolioTemplates,
  ...(PHASE_2_TEMPLATES_ENABLED ? phase2PortfolioTemplates : []),
];

const coreTemplateIds = new Set<string>(corePortfolioTemplates.map((template) => template.id));
const phase2TemplateIds = new Set<string>(phase2PortfolioTemplates.map((template) => template.id));

export function isPhase2PortfolioTemplate(theme: string) {
  return phase2TemplateIds.has(theme);
}

export function normalizePortfolioTheme(theme: string, phase2Enabled = PHASE_2_TEMPLATES_ENABLED) {
  if (coreTemplateIds.has(theme)) return theme;
  if (phase2Enabled && phase2TemplateIds.has(theme)) return theme;
  return "studio";
}

export const portfolioTemplateNames = Object.fromEntries(
  [...corePortfolioTemplates, ...phase2PortfolioTemplates].map((template) => [template.id, template.name]),
) as Record<string, string>;
