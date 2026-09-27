export const CARE_SUPPORT_ENABLED = process.env.NEXT_PUBLIC_VXL_PHASE2_PRIORITY_SUPPORT !== "false";

export const CARE_SUPPORT_CATEGORIES = [
  "portfolio",
  "custom_domain",
  "technical",
  "account",
  "billing",
  "other",
] as const;

export const CARE_SUPPORT_STATUSES = [
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed",
] as const;

export type CareSupportCategory = typeof CARE_SUPPORT_CATEGORIES[number];
export type CareSupportStatus = typeof CARE_SUPPORT_STATUSES[number];
export type CareRequestType = "priority_support" | "managed_update";

export function isActiveCarePlan(plan: unknown, status: unknown, periodEndsAt: unknown, now = Date.now()) {
  return plan === "care"
    && status === "active"
    && typeof periodEndsAt === "string"
    && new Date(periodEndsAt).getTime() > now;
}

export function careCycleWindow(periodStartsAt: unknown, periodEndsAt: unknown, now = Date.now()) {
  if (typeof periodStartsAt !== "string" || typeof periodEndsAt !== "string") return null;
  const start = new Date(periodStartsAt).getTime();
  const end = new Date(periodEndsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || now < start || now >= end) return null;
  const cycleMs = 28 * 86_400_000;
  const cycleIndex = Math.max(0, Math.floor((now - start) / cycleMs));
  const cycleStart = start + cycleIndex * cycleMs;
  return {
    startsAt: new Date(cycleStart).toISOString(),
    endsAt: new Date(Math.min(end, cycleStart + cycleMs)).toISOString(),
  };
}

export function isCareSupportCategory(value: unknown): value is CareSupportCategory {
  return typeof value === "string" && (CARE_SUPPORT_CATEGORIES as readonly string[]).includes(value);
}

export function isCareSupportStatus(value: unknown): value is CareSupportStatus {
  return typeof value === "string" && (CARE_SUPPORT_STATUSES as readonly string[]).includes(value);
}
