"use client";

import { sendGAEvent } from "@next/third-parties/google";
import type { BillingCycle, PaidPlan } from "@/lib/plans";

export const ANALYTICS_CONSENT_KEY = "vxl_analytics_consent";
export const PENDING_AUTH_EVENT_KEY = "vxl_pending_auth_event";
export type AnalyticsConsent = "granted" | "denied";
export type AuthMethod = "email" | "google";

export type EcommerceItem = {
  item_id: string;
  item_name: string;
  item_category: "access_plan";
  price: number;
  quantity: 1;
};

export type AnalyticsParameters = Partial<{
  plan_name: PaidPlan;
  template_name: string;
  auth_method: AuthMethod;
  source: string;
  feature_name: string;
  payment_provider: "razorpay";
  currency: "INR";
  value: number;
  transaction_id: string;
  item_list_id: string;
  item_list_name: string;
  items: EcommerceItem[];
}>;

export type VxlEventName =
  | "sign_up"
  | "login"
  | "resume_upload"
  | "resume_import_complete"
  | "builder_started"
  | "template_selected"
  | "ai_improve_used"
  | "preview_viewed"
  | "portfolio_publish_started"
  | "portfolio_published"
  | "pricing_viewed"
  | "plan_selected"
  | "checkout_started"
  | "payment_success"
  | "payment_failed"
  | "plan_activated"
  | "custom_link_added"
  | "analytics_viewed";

function isProductionSite() {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return false;
  return window.location.hostname === "www.thevxl.com" || window.location.hostname === "thevxl.com";
}

export function analyticsAllowed() {
  return isProductionSite() && window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted";
}

export function updateAnalyticsConsent(consent: AnalyticsConsent) {
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  window.gtag?.("consent", "update", {
    analytics_storage: consent,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });
}

export function trackEvent(name: VxlEventName, parameters: AnalyticsParameters = {}) {
  if (!analyticsAllowed()) return;
  sendGAEvent("event", name, parameters);
}

export function queueAuthEvent(event: "sign_up" | "login", method: AuthMethod) {
  window.sessionStorage.setItem(PENDING_AUTH_EVENT_KEY, JSON.stringify({ event, method }));
}

export function trackOncePerSession(key: string, name: VxlEventName, parameters: AnalyticsParameters = {}) {
  if (!analyticsAllowed()) return;
  const storageKey = `vxl_ga_once:${key}`;
  if (window.sessionStorage.getItem(storageKey)) return;
  window.sessionStorage.setItem(storageKey, "1");
  trackEvent(name, parameters);
}

export function planItem(plan: PaidPlan, cycle: BillingCycle, value: number): EcommerceItem {
  return {
    item_id: `vxl_${plan}_${cycle}`,
    item_name: `VXL ${plan[0].toUpperCase()}${plan.slice(1)} · ${cycle === "annual" ? "365 days" : "28 days"}`,
    item_category: "access_plan",
    price: value,
    quantity: 1,
  };
}

export function trackRecommendedEvent(name: "view_item" | "view_item_list" | "begin_checkout", parameters: AnalyticsParameters) {
  if (!analyticsAllowed()) return;
  sendGAEvent("event", name, parameters);
}

export function trackConfirmedPurchase(parameters: AnalyticsParameters & { transaction_id: string }) {
  if (!analyticsAllowed()) return;
  const storageKey = `vxl_ga_purchase:${parameters.transaction_id}`;
  if (window.localStorage.getItem(storageKey)) return;
  window.localStorage.setItem(storageKey, "1");
  trackEvent("payment_success", parameters);
  sendGAEvent("event", "purchase", parameters);
}

export function trackTransactionEvent(transactionId: string, name: "plan_activated", parameters: AnalyticsParameters) {
  if (!analyticsAllowed()) return;
  const storageKey = `vxl_ga_${name}:${transactionId}`;
  if (window.localStorage.getItem(storageKey)) return;
  window.localStorage.setItem(storageKey, "1");
  trackEvent(name, { ...parameters, transaction_id: transactionId });
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
