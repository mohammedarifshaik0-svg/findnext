import assert from "node:assert/strict";
import { planComparisonRows, recommendationReason, recommendPlan } from "../lib/plan-guide.ts";

assert.equal(recommendPlan({ frequency: null, proof: "no", humanHelp: "no" }), null);
assert.equal(recommendPlan({ frequency: "occasionally", proof: "no", humanHelp: "no" }), "live");
assert.equal(recommendPlan({ frequency: "frequently", proof: "no", humanHelp: "no" }), "flex");
assert.equal(recommendPlan({ frequency: "occasionally", proof: "yes", humanHelp: "no" }), "flex");
assert.equal(recommendPlan({ frequency: "frequently", proof: "yes", humanHelp: "yes" }), "care");
assert.match(recommendationReason("care", { frequency: "occasionally", proof: "no", humanHelp: "yes" }), /real person/i);

const available = planComparisonRows({ core: true, analytics: true, domains: true, support: true });
const disabled = planComparisonRows({ core: false, analytics: false, domains: false, support: false });
assert.equal(available.length, 16);
assert.equal(available.find((row) => row.feature === "Custom sections")?.flex, "Up to 5");
assert.equal(disabled.find((row) => row.feature === "Custom sections")?.flex, "Coming soon");
assert.equal(disabled.find((row) => row.feature === "Portfolio analytics")?.live, "Lifetime views");
assert.equal(disabled.find((row) => row.feature === "Priority support")?.care, "Coming soon");
