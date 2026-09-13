import { Crown, Rocket, ShieldCheck, Sparkles } from "lucide-react";

export type WorkspacePlan = "free" | "live" | "flex" | "care";

const planIdentity = {
  free: { label: "Free", Icon: Rocket },
  live: { label: "Live", Icon: ShieldCheck },
  flex: { label: "Flex", Icon: Sparkles },
  care: { label: "Care", Icon: Crown },
} as const;

export function PlanBadge({ plan, active = plan !== "free", compact = false }: { plan: WorkspacePlan; active?: boolean; compact?: boolean }) {
  const { label, Icon } = planIdentity[plan];
  return (
    <span className={`vxl-plan-badge is-${plan}${compact ? " is-compact" : ""}`}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
      {active && <i aria-hidden="true" />}
      <small>{active ? "Active" : "Version"}</small>
    </span>
  );
}
