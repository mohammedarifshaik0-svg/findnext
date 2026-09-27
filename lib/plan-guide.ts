import type { PaidPlan } from "@/lib/plans";

export const PLAN_GUIDE_ENABLED = process.env.NEXT_PUBLIC_VXL_PHASE2_PLAN_GUIDE !== "false";

export type UpdateFrequency = "occasionally" | "frequently";
export type YesNo = "yes" | "no";
export type PlanGuideAnswers = {
  frequency: UpdateFrequency | null;
  proof: YesNo | null;
  humanHelp: YesNo | null;
};

export type PlanComparisonRow = {
  feature: string;
  live: string;
  flex: string;
  care: string;
};

export function recommendPlan(answers: PlanGuideAnswers): PaidPlan | null {
  if (!answers.frequency || !answers.proof || !answers.humanHelp) return null;
  if (answers.humanHelp === "yes") return "care";
  if (answers.frequency === "frequently" || answers.proof === "yes") return "flex";
  return "live";
}

export function recommendationReason(plan: PaidPlan, answers: PlanGuideAnswers) {
  if (plan === "care") return "You want the complete Flex toolkit plus a real person to help maintain your portfolio.";
  if (plan === "flex" && answers.proof === "yes") return "You want deeper project proof, custom sections or case studies, so Flex gives you the right creative room.";
  if (plan === "flex") return "You expect your portfolio to change frequently, so unlimited publishing makes Flex the practical choice.";
  return "You need a polished portfolio online with occasional changes and no advanced Showcase requirements.";
}

const status = (available: boolean, included: string) => available ? included : "Coming soon";

export function planComparisonRows(flags: { core: boolean; analytics: boolean; domains: boolean; support: boolean }): PlanComparisonRow[] {
  return [
    { feature: "Portfolio live", live: "1", flex: "1", care: "1" },
    { feature: "Published changes", live: "2 / 28 days", flex: "Unlimited", care: "Unlimited" },
    { feature: "Résumé refreshes", live: "1 / 28 days", flex: "5 / 28 days", care: "10 / 28 days" },
    { feature: "AI writing improvements", live: "3 / 28 days", flex: "30 / 28 days", care: "60 / 28 days" },
    { feature: "Custom sections", live: "—", flex: status(flags.core, "Up to 5"), care: status(flags.core, "Unlimited") },
    { feature: "Portfolio Showcases", live: "—", flex: status(flags.core, "Included"), care: status(flags.core, "Included") },
    { feature: "Images and galleries", live: "—", flex: status(flags.core, "Included"), care: status(flags.core, "Included") },
    { feature: "Evidence and external links", live: "—", flex: status(flags.core, "Included"), care: status(flags.core, "Included") },
    { feature: "Expandable detail pages", live: "—", flex: status(flags.core, "Included"), care: status(flags.core, "Included") },
    { feature: "Advanced customization", live: "—", flex: status(flags.core, "Included"), care: status(flags.core, "Included") },
    { feature: "Portfolio analytics", live: "Lifetime views", flex: status(flags.analytics, "90 days"), care: status(flags.analytics, "1 year") },
    { feature: "Version history", live: "Latest version", flex: status(flags.core, "90 days"), care: status(flags.core, "1 year") },
    { feature: "Custom domain", live: "—", flex: status(flags.domains, "Self-service"), care: status(flags.domains, "Guided setup") },
    { feature: "Remove VXL branding", live: "—", flex: "Included", care: "Included" },
    { feature: "Managed update", live: "—", flex: "—", care: "1 / 28 days" },
    { feature: "Priority support", live: "—", flex: "—", care: status(flags.support, "Included") },
  ];
}
