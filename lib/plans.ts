export type BillingCycle = "28_days" | "annual";
export type PaidPlan = "live" | "flex" | "care";

export type PlanFeature = {
  label: string;
  detail: string;
  included: boolean;
  comingSoon?: boolean;
};

export const PLAN_PRICES: Record<PaidPlan, Record<BillingCycle, number>> = {
  live: { "28_days": 99, annual: 999 },
  flex: { "28_days": 199, annual: 1999 },
  care: { "28_days": 499, annual: 4999 },
};

export const PLAN_LIMITS = {
  live: { published_updates: 2, resume_reimports: 1, ai_improvements: 3 },
  flex: { published_updates: null, resume_reimports: 5, ai_improvements: 30 },
  care: { published_updates: null, resume_reimports: 10, ai_improvements: 60 },
} as const;

export const PLANS: Array<{
  id: PaidPlan;
  name: string;
  eyebrow: string;
  description: string;
  bestFor: string;
  features: PlanFeature[];
  featured?: boolean;
}> = [
  {
    id: "live",
    name: "Live",
    eyebrow: "Start here",
    description: "Everything needed to keep one polished portfolio online.",
    bestFor: "A finished profile that changes occasionally.",
    features: [
      { label: "Portfolio hosting", detail: "Your VXL address stays live", included: true },
      { label: "Templates & styling", detail: "Every template, palette and effect", included: true },
      { label: "Published updates", detail: "2 every 28 days", included: true },
      { label: "Résumé re-imports", detail: "1 every 28 days", included: true },
      { label: "AI writing", detail: "3 fact-checked improvements every 28 days", included: true },
      { label: "Analytics", detail: "Lifetime visit total", included: true },
      { label: "Version history", detail: "Latest published version only", included: true },
      { label: "Custom domain", detail: "Not included", included: false },
      { label: "Managed updates", detail: "Not included", included: false },
    ],
  },
  {
    id: "flex",
    name: "Flex",
    eyebrow: "Most popular",
    description: "Freedom to keep your portfolio current whenever your career moves.",
    bestFor: "Active job seekers, freelancers and growing careers.",
    featured: true,
    features: [
      { label: "Everything in Live", detail: "All templates and hosting", included: true },
      { label: "Published updates", detail: "Unlimited", included: true },
      { label: "Résumé re-imports", detail: "5 every 28 days", included: true },
      { label: "AI writing", detail: "30 fact-checked improvements every 28 days", included: true },
      { label: "Analytics", detail: "Detailed insights for 90 days", included: true },
      { label: "Version history", detail: "Restore versions from 90 days", included: true },
      { label: "Custom domain", detail: "Connection workflow is being built", included: false, comingSoon: true },
      { label: "Priority support", detail: "Faster email support", included: true },
      { label: "Managed updates", detail: "Not included", included: false },
    ],
  },
  {
    id: "care",
    name: "Care",
    eyebrow: "Human help",
    description: "The full VXL experience with a real person beside you.",
    bestFor: "People who want the result without managing every detail.",
    features: [
      { label: "All current Flex features", detail: "Unlimited publishing and advanced tools", included: true },
      { label: "Résumé re-imports", detail: "10 every 28 days", included: true },
      { label: "AI writing", detail: "60 fact-checked improvements every 28 days", included: true },
      { label: "Analytics", detail: "Detailed insights for 1 year", included: true },
      { label: "Version history", detail: "Restore versions from 1 year", included: true },
      { label: "Managed update", detail: "1 request every 28 days", included: true },
      { label: "Custom domain setup", detail: "Guided connection is being built", included: false, comingSoon: true },
      { label: "Personal priority help", detail: "Real human support", included: true },
    ],
  },
];

export const UNIVERSAL_BENEFITS = [
  "Every template, palette, typeface and visual effect",
  "Optional profile photo",
  "Résumé download and contact button",
  "Responsive site, HTTPS, privacy and no ads",
  "Your profile data remains saved if a plan expires",
] as const;
