export type PortfolioPalette = {
  id: string;
  name: string;
  description: string;
  colors: [string, string, string];
  background: string;
};

export const portfolioPalettes: Record<string, readonly PortfolioPalette[]> = {
  studio: [
    { id: "champagne", name: "Champagne", description: "Warm, refined and editorial", colors: ["#dfba86", "#7c5cff", "#090e22"], background: "#090e22" },
    { id: "sapphire", name: "Sapphire", description: "Cool, assured and modern", colors: ["#78c7ff", "#3758d6", "#071529"], background: "#071529" },
    { id: "rosewood", name: "Rosewood", description: "Rich, human and expressive", colors: ["#f4a7a1", "#9b4667", "#1d0d18"], background: "#1d0d18" },
  ],
  canvas: [
    { id: "aurora", name: "Aurora", description: "Cyan, violet and magenta", colors: ["#00fff5", "#8c00ff", "#ff0099"], background: "#050508" },
    { id: "sunset", name: "Sunset", description: "Coral, magenta and gold", colors: ["#ff5959", "#ff0099", "#ffd600"], background: "#100508" },
    { id: "ocean", name: "Ocean", description: "Deep blue and electric cyan", colors: ["#00d9ff", "#0f2180", "#6d5dfc"], background: "#030914" },
  ],
  ledger: [
    { id: "moss", name: "Moss", description: "Quiet organic green", colors: ["#9fb292", "#526d5a", "#000000"], background: "#000000" },
    { id: "ice", name: "Ice", description: "Clean technical blue", colors: ["#9dd9e8", "#426d7a", "#000306"], background: "#000306" },
    { id: "oxide", name: "Oxide", description: "Warm copper restraint", colors: ["#d79a72", "#765142", "#080402"], background: "#080402" },
  ],
};

export const defaultPaletteForTheme: Record<string, string> = {
  studio: "champagne",
  canvas: "aurora",
  ledger: "moss",
};

export function palettesForTheme(theme: string) {
  return portfolioPalettes[theme] ?? portfolioPalettes.studio;
}

export function paletteFor(theme: string, paletteId?: string) {
  const palettes = palettesForTheme(theme);
  return palettes.find((palette) => palette.id === paletteId) ?? palettes[0];
}

export function portfolioStyle(theme: string, paletteId?: string, intensity = 65) {
  const palette = paletteFor(theme, paletteId);
  const normalized = Math.max(0, Math.min(100, Number(intensity) || 0)) / 100;
  return {
    "--portfolio-accent": palette.colors[0],
    "--portfolio-accent-2": palette.colors[1],
    "--portfolio-accent-3": palette.colors[2],
    "--portfolio-bg": palette.background,
    "--portfolio-fx": normalized.toFixed(2),
  } as CSSProperties;
}
import type { CSSProperties } from "react";
