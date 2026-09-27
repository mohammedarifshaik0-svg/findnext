import assert from "node:assert/strict";
import { hasGenericCliche, hasProfessionalSummaryShape, writingSimilarity } from "../lib/ai-writing-quality.ts";

assert.equal(writingSimilarity("Business analyst focused on growth", "Business analyst focused on growth"), 1);
assert.ok(writingSimilarity("Business analyst focused on growth", "Customer success specialist improving retention") < 0.2);
assert.equal(hasGenericCliche("A passionate, results-driven professional"), true);
assert.equal(hasGenericCliche("I turn customer data into clear commercial decisions."), false);

const groundedSummary = "I turn customer and campaign data into decisions that commercial teams can use. My experience covers customer success, digital engagement and reporting, with hands-on work across dashboards, opportunity analysis and stakeholder communication. I focus on making performance visible, finding practical gaps and helping teams act with more confidence. I bring clear writing, structured analysis and a commercially grounded approach to every project.";
assert.equal(hasProfessionalSummaryShape(groundedSummary), true);
assert.equal(hasProfessionalSummaryShape("Experienced analyst with useful skills."), false);
