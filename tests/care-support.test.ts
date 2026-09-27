import assert from "node:assert/strict";
import { careCycleWindow, isActiveCarePlan, isCareSupportCategory, isCareSupportStatus } from "../lib/care-support.ts";
import { hasBrandFreePortfolio } from "../lib/plans.ts";

const start = "2026-01-01T00:00:00.000Z";
const end = "2026-12-31T00:00:00.000Z";
const day40 = new Date("2026-02-10T12:00:00.000Z").getTime();

assert.equal(isActiveCarePlan("care", "active", end, day40), true);
assert.equal(isActiveCarePlan("flex", "active", end, day40), false);
assert.equal(isActiveCarePlan("care", "expired", end, day40), false);
assert.equal(isActiveCarePlan("care", "active", "2026-01-02T00:00:00.000Z", day40), false);

assert.deepEqual(careCycleWindow(start, end, day40), {
  startsAt: "2026-01-29T00:00:00.000Z",
  endsAt: "2026-02-26T00:00:00.000Z",
});
assert.equal(careCycleWindow(start, end, new Date("2025-12-31T00:00:00.000Z").getTime()), null);
assert.equal(careCycleWindow(start, end, new Date(end).getTime()), null);

assert.equal(isCareSupportCategory("custom_domain"), true);
assert.equal(isCareSupportCategory("admin"), false);
assert.equal(isCareSupportStatus("waiting_on_customer"), true);
assert.equal(isCareSupportStatus("deleted"), false);

assert.equal(hasBrandFreePortfolio("flex", "active", end, day40), true);
assert.equal(hasBrandFreePortfolio("care", "active", end, day40), true);
assert.equal(hasBrandFreePortfolio("live", "active", end, day40), false);
assert.equal(hasBrandFreePortfolio("flex", "active", "2026-01-02T00:00:00.000Z", day40), false);
