import assert from "node:assert/strict";
import { advancedSectionKeys, customSectionLimit, isShowcasePlan, normalizeAdvancedCustomization, normalizeHttpsUrl, showcaseSlug } from "../lib/phase2-showcases.ts";

const future = new Date(Date.now() + 60_000).toISOString();
const past = new Date(Date.now() - 60_000).toISOString();

assert.equal(isShowcasePlan("flex", "active", future), true);
assert.equal(isShowcasePlan("care", "active", future), true);
assert.equal(isShowcasePlan("live", "active", future), false);
assert.equal(isShowcasePlan("flex", "expired", future), false);
assert.equal(isShowcasePlan("flex", "active", past), false);
assert.equal(showcaseSlug(" Revenue Recovery: $400K "), "revenue-recovery-400k");
assert.equal(showcaseSlug("***", "project-1"), "project-1");
assert.equal(normalizeHttpsUrl("www.ignyxx.in"), "https://www.ignyxx.in/");
assert.equal(normalizeHttpsUrl("ignyxx.in/work"), "https://ignyxx.in/work");
assert.equal(normalizeHttpsUrl("http://ignyxx.in"), "");
assert.equal(normalizeHttpsUrl("javascript:alert(1)"), "");
assert.equal(customSectionLimit("live"), 0);
assert.equal(customSectionLimit("flex"), 5);
assert.equal(customSectionLimit("care"), null);

const customization = normalizeAdvancedCustomization({
  sectionOrder: ["projects", "projects", "story", "unknown"],
  density: "compact",
  cornerStyle: "invalid",
  headingStyle: "statement",
  showcaseStyle: "grid",
  sectionTreatments: { projects: "tinted", story: "dangerous" },
});
assert.deepEqual(customization.sectionOrder, ["projects", "story", "skills", "experience", "education", "custom"]);
assert.equal(customization.density, "compact");
assert.equal(customization.cornerStyle, "soft");
assert.equal(customization.headingStyle, "statement");
assert.equal(customization.showcaseStyle, "grid");
assert.equal(customization.sectionTreatments.projects, "tinted");
assert.equal(customization.sectionTreatments.story, "plain");
assert.deepEqual(Object.keys(customization.sectionTreatments), [...advancedSectionKeys]);
