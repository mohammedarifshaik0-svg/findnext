import assert from "node:assert/strict";
import { corePortfolioTemplates, isPhase2PortfolioTemplate, normalizePortfolioTheme, phase2PortfolioTemplates } from "../lib/phase2-templates.ts";
import { defaultPaletteForTheme, defaultTextFinishForTheme, palettesForTheme, textFinishesForTheme } from "../lib/portfolio-style.ts";

assert.equal(phase2PortfolioTemplates.length, 4);
assert.equal(new Set(phase2PortfolioTemplates.map((template) => template.id)).size, 4);
assert.equal(new Set([...corePortfolioTemplates, ...phase2PortfolioTemplates].map((template) => template.id)).size, corePortfolioTemplates.length + 4);

for (const template of phase2PortfolioTemplates) {
  assert.equal(isPhase2PortfolioTemplate(template.id), true);
  assert.equal(normalizePortfolioTheme(template.id, false), "studio");
  assert.equal(normalizePortfolioTheme(template.id, true), template.id);
  assert.ok(palettesForTheme(template.id).length >= 3);
  assert.ok(textFinishesForTheme(template.id).length >= 3);
  assert.ok(defaultPaletteForTheme[template.id]);
  assert.ok(defaultTextFinishForTheme[template.id]);
}

assert.equal(normalizePortfolioTheme("mono-paper", false), "mono-paper");
assert.equal(normalizePortfolioTheme("not-a-template", true), "studio");
assert.equal(isPhase2PortfolioTemplate("studio"), false);
