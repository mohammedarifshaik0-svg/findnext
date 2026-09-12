export type PortfolioPalette = {
  id: string;
  name: string;
  description: string;
  colors: [string, string, string];
  background: string;
};

export type TextFinish = {
  id: string;
  name: string;
  description: string;
  primary: string;
  muted: string;
};

export const portfolioPalettes: Record<string, readonly PortfolioPalette[]> = {
  studio: [
    {
      id: "champagne",
      name: "Champagne",
      description: "Warm, refined and editorial",
      colors: ["#dfba86", "#7c5cff", "#090e22"],
      background: "#090e22",
    },
    {
      id: "sapphire",
      name: "Sapphire",
      description: "Cool, assured and modern",
      colors: ["#78c7ff", "#3758d6", "#071529"],
      background: "#071529",
    },
    {
      id: "rosewood",
      name: "Rosewood",
      description: "Rich, human and expressive",
      colors: ["#f4a7a1", "#9b4667", "#1d0d18"],
      background: "#1d0d18",
    },
  ],
  canvas: [
    {
      id: "aurora",
      name: "Aurora",
      description: "Cyan, violet and magenta",
      colors: ["#00fff5", "#8c00ff", "#ff0099"],
      background: "#050508",
    },
    {
      id: "sunset",
      name: "Sunset",
      description: "Coral, magenta and gold",
      colors: ["#ff5959", "#ff0099", "#ffd600"],
      background: "#100508",
    },
    {
      id: "ocean",
      name: "Ocean",
      description: "Deep blue and electric cyan",
      colors: ["#00d9ff", "#0f2180", "#6d5dfc"],
      background: "#030914",
    },
  ],
  ledger: [
    {
      id: "moss",
      name: "Moss",
      description: "Quiet organic green",
      colors: ["#9fb292", "#526d5a", "#000000"],
      background: "#000000",
    },
    {
      id: "ice",
      name: "Ice",
      description: "Clean technical blue",
      colors: ["#9dd9e8", "#426d7a", "#000306"],
      background: "#000306",
    },
    {
      id: "oxide",
      name: "Oxide",
      description: "Warm copper restraint",
      colors: ["#d79a72", "#765142", "#080402"],
      background: "#080402",
    },
  ],
  "mono-brutalist": [
    {
      id: "signal",
      name: "Signal",
      description: "Black ink on sharp white",
      colors: ["#000000", "#ffffff", "#000000"],
      background: "#ffffff",
    },
    { id: "redline", name: "Redline", description: "Urgent red on warm white", colors: ["#dc2626", "#111111", "#fffaf2"], background: "#fffaf2" },
    { id: "cobalt", name: "Cobalt", description: "Electric blue and hard black", colors: ["#1d4ed8", "#050505", "#f8fafc"], background: "#f8fafc" },
  ],
  "mono-chrome": [
    {
      id: "chrome",
      name: "Chrome",
      description: "Polished monochrome depth",
      colors: ["#f4f4f5", "#71717a", "#09090b"],
      background: "#09090b",
    },
    { id: "graphite", name: "Graphite", description: "Deep mineral gray", colors: ["#e4e4e7", "#52525b", "#18181b"], background: "#18181b" },
    { id: "pearl", name: "Pearl", description: "Light chrome and soft shadow", colors: ["#27272a", "#a1a1aa", "#fafafa"], background: "#fafafa" },
  ],
  "mono-editorial": [
    {
      id: "ink",
      name: "Ink",
      description: "Editorial black and soft gray",
      colors: ["#ffffff", "#737373", "#111111"],
      background: "#111111",
    },
    { id: "oxblood", name: "Oxblood", description: "Literary burgundy restraint", colors: ["#f5f0eb", "#9f6b73", "#260d13"], background: "#260d13" },
    { id: "midnight", name: "Midnight", description: "Inky blue editorial depth", colors: ["#f8fafc", "#7787a3", "#080d18"], background: "#080d18" },
  ],
  "mono-glass": [
    {
      id: "slate",
      name: "Slate",
      description: "Cool translucent elevation",
      colors: ["#f9fafb", "#6b7280", "#1f2937"],
      background: "#374151",
    },
    { id: "smoke", name: "Smoke", description: "Neutral glass and charcoal", colors: ["#fafafa", "#71717a", "#27272a"], background: "#27272a" },
    { id: "glacier", name: "Glacier", description: "Icy blue translucent layers", colors: ["#ecfeff", "#67a6b8", "#18313b"], background: "#18313b" },
  ],
  "mono-paper": [
    {
      id: "paper",
      name: "Paper",
      description: "Warm paper and graphite",
      colors: ["#1c1917", "#a8a29e", "#fafaf9"],
      background: "#fafaf9",
    },
    { id: "parchment", name: "Parchment", description: "Warm archival paper", colors: ["#292524", "#a16207", "#f7eedb"], background: "#f7eedb" },
    { id: "sage", name: "Sage", description: "Calm botanical paper", colors: ["#1c2520", "#6b7c6a", "#eef1e9"], background: "#eef1e9" },
  ],
};

export const defaultPaletteForTheme: Record<string, string> = {
  studio: "champagne",
  canvas: "aurora",
  ledger: "moss",
  "mono-brutalist": "signal",
  "mono-chrome": "chrome",
  "mono-editorial": "ink",
  "mono-glass": "slate",
  "mono-paper": "paper",
};

export const textFinishes: Record<string, readonly TextFinish[]> = {
  studio: [
    {
      id: "ivory",
      name: "Ivory",
      description: "Original warm editorial",
      primary: "#f4efeb",
      muted: "#aab1c5",
    },
    {
      id: "pearl",
      name: "Pearl",
      description: "Crisp and contemporary",
      primary: "#f8fafc",
      muted: "#b8c4d8",
    },
    {
      id: "parchment",
      name: "Parchment",
      description: "Soft literary warmth",
      primary: "#fff0df",
      muted: "#cbb9a6",
    },
  ],
  canvas: [
    {
      id: "polar",
      name: "Polar",
      description: "Original luminous white",
      primary: "#ffffff",
      muted: "#94a3b8",
    },
    {
      id: "lilac",
      name: "Lilac",
      description: "Dreamlike violet light",
      primary: "#f6efff",
      muted: "#c4b5fd",
    },
    {
      id: "glacier",
      name: "Glacier",
      description: "Cool cinematic clarity",
      primary: "#ecfeff",
      muted: "#9edee8",
    },
  ],
  ledger: [
    {
      id: "chalk",
      name: "Chalk",
      description: "Original pure contrast",
      primary: "#ffffff",
      muted: "#7e7e86",
    },
    {
      id: "mist",
      name: "Mist",
      description: "Quiet mineral green",
      primary: "#e7f0ee",
      muted: "#8aa09b",
    },
    {
      id: "sand",
      name: "Sand",
      description: "Warm restrained neutral",
      primary: "#f4efe6",
      muted: "#9f9588",
    },
  ],
  "mono-brutalist": [
    {
      id: "ink",
      name: "Ink",
      description: "Maximum readable contrast",
      primary: "#000000",
      muted: "#3f3f46",
    },
    { id: "carbon", name: "Carbon", description: "Dense graphic black", primary: "#111111", muted: "#52525b" },
    { id: "blueprint", name: "Blueprint", description: "Technical cobalt copy", primary: "#172554", muted: "#64748b" },
  ],
  "mono-chrome": [
    {
      id: "silver",
      name: "Silver",
      description: "Cool metallic clarity",
      primary: "#ffffff",
      muted: "#a1a1aa",
    },
    { id: "platinum", name: "Platinum", description: "Bright metallic contrast", primary: "#fafafa", muted: "#d4d4d8" },
    { id: "charcoal", name: "Charcoal", description: "Soft dark-page typography", primary: "#27272a", muted: "#71717a" },
  ],
  "mono-editorial": [
    {
      id: "pearl",
      name: "Pearl",
      description: "Soft editorial contrast",
      primary: "#ffffff",
      muted: "#a3a3a3",
    },
    { id: "vellum", name: "Vellum", description: "Warm magazine paper", primary: "#fff7ed", muted: "#c4a79a" },
    { id: "blueblack", name: "Blue Black", description: "Cool editorial authority", primary: "#eaf0ff", muted: "#94a3b8" },
  ],
  "mono-glass": [
    {
      id: "frost",
      name: "Frost",
      description: "Soft glass legibility",
      primary: "#ffffff",
      muted: "#d1d5db",
    },
    { id: "ice", name: "Ice", description: "Crisp translucent white", primary: "#ecfeff", muted: "#bae6fd" },
    { id: "smoke", name: "Smoke", description: "Subdued glass typography", primary: "#f4f4f5", muted: "#a1a1aa" },
  ],
  "mono-paper": [
    {
      id: "graphite",
      name: "Graphite",
      description: "Warm print-like contrast",
      primary: "#1c1917",
      muted: "#78716c",
    },
    { id: "sepia", name: "Sepia", description: "Warm archival ink", primary: "#3f2d20", muted: "#8b735f" },
    { id: "forest", name: "Forest", description: "Quiet botanical ink", primary: "#183126", muted: "#617367" },
  ],
};

export const defaultTextFinishForTheme: Record<string, string> = {
  studio: "ivory",
  canvas: "polar",
  ledger: "chalk",
  "mono-brutalist": "ink",
  "mono-chrome": "silver",
  "mono-editorial": "pearl",
  "mono-glass": "frost",
  "mono-paper": "graphite",
};

export function palettesForTheme(theme: string) {
  return portfolioPalettes[theme] ?? portfolioPalettes.studio;
}

export function paletteFor(theme: string, paletteId?: string) {
  const palettes = palettesForTheme(theme);
  return palettes.find((palette) => palette.id === paletteId) ?? palettes[0];
}

export function textFinishesForTheme(theme: string) {
  return textFinishes[theme] ?? textFinishes.studio;
}

export function textFinishFor(theme: string, finishId?: string) {
  const finishes = textFinishesForTheme(theme);
  return finishes.find((finish) => finish.id === finishId) ?? finishes[0];
}

export function portfolioStyle(theme: string, paletteId?: string, intensity = 65, textFinishId?: string) {
  const palette = paletteFor(theme, paletteId);
  const text = textFinishFor(theme, textFinishId);
  const normalized = Math.max(0, Math.min(100, Number(intensity) || 0)) / 100;
  return {
    "--portfolio-accent": palette.colors[0],
    "--portfolio-accent-2": palette.colors[1],
    "--portfolio-accent-3": palette.colors[2],
    "--portfolio-bg": palette.background,
    "--portfolio-text": text.primary,
    "--portfolio-muted": text.muted,
    "--portfolio-fx": normalized.toFixed(2),
  } as CSSProperties;
}
import type { CSSProperties } from "react";
