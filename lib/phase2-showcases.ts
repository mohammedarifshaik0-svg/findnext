export type ShowcaseLinkKind = "live" | "github" | "figma" | "drive" | "document" | "credential" | "other";

export type ShowcaseLink = {
  id: string;
  label: string;
  url: string;
  kind: ShowcaseLinkKind;
};

export type ShowcaseMedia = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  assetId?: string;
  kind?: "image" | "document";
  name?: string;
};

export type PortfolioShowcase = {
  id: string;
  sourceType: "project";
  sourceId: string;
  slug: string;
  title: string;
  summary: string;
  challenge: string;
  approach: string;
  outcome: string;
  links: ShowcaseLink[];
  media: ShowcaseMedia[];
  isEnabled: boolean;
};

export type CustomSectionItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  dateLabel: string;
};

export type CustomSection = {
  id: string;
  title: string;
  description: string;
  layout: "cards" | "list" | "timeline";
  isVisible: boolean;
  items: CustomSectionItem[];
};

export const advancedSectionKeys = ["story", "skills", "experience", "projects", "education", "custom"] as const;
export type AdvancedSectionKey = (typeof advancedSectionKeys)[number];
export type SectionTreatment = "plain" | "tinted" | "outline";

export type AdvancedCustomization = {
  sectionOrder: AdvancedSectionKey[];
  density: "compact" | "balanced" | "spacious";
  cornerStyle: "sharp" | "soft" | "rounded";
  headingStyle: "editorial" | "modern" | "statement";
  showcaseStyle: "immersive" | "minimal" | "grid";
  sectionTreatments: Record<AdvancedSectionKey, SectionTreatment>;
};

export const defaultAdvancedCustomization: AdvancedCustomization = {
  sectionOrder: [...advancedSectionKeys],
  density: "balanced",
  cornerStyle: "soft",
  headingStyle: "modern",
  showcaseStyle: "immersive",
  sectionTreatments: {
    story: "plain",
    skills: "plain",
    experience: "plain",
    projects: "plain",
    education: "plain",
    custom: "plain",
  },
};

export function normalizeAdvancedCustomization(input: unknown): AdvancedCustomization {
  const row = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const requestedOrder = Array.isArray(row.sectionOrder) ? row.sectionOrder : [];
  const sectionOrder = [
    ...requestedOrder.filter((key): key is AdvancedSectionKey => typeof key === "string" && advancedSectionKeys.includes(key as AdvancedSectionKey)),
    ...advancedSectionKeys,
  ].filter((key, index, values) => values.indexOf(key) === index);
  const treatments = row.sectionTreatments && typeof row.sectionTreatments === "object" && !Array.isArray(row.sectionTreatments)
    ? row.sectionTreatments as Record<string, unknown>
    : {};
  const treatment = (key: AdvancedSectionKey): SectionTreatment => ["plain", "tinted", "outline"].includes(String(treatments[key]))
    ? treatments[key] as SectionTreatment
    : defaultAdvancedCustomization.sectionTreatments[key];
  return {
    sectionOrder,
    density: ["compact", "balanced", "spacious"].includes(String(row.density)) ? row.density as AdvancedCustomization["density"] : "balanced",
    cornerStyle: ["sharp", "soft", "rounded"].includes(String(row.cornerStyle)) ? row.cornerStyle as AdvancedCustomization["cornerStyle"] : "soft",
    headingStyle: ["editorial", "modern", "statement"].includes(String(row.headingStyle)) ? row.headingStyle as AdvancedCustomization["headingStyle"] : "modern",
    showcaseStyle: ["immersive", "minimal", "grid"].includes(String(row.showcaseStyle)) ? row.showcaseStyle as AdvancedCustomization["showcaseStyle"] : "immersive",
    sectionTreatments: Object.fromEntries(advancedSectionKeys.map((key) => [key, treatment(key)])) as Record<AdvancedSectionKey, SectionTreatment>,
  };
}

export const PHASE_2_SHOWCASES_ENABLED = process.env.NEXT_PUBLIC_VXL_PHASE2_SHOWCASES === "true";

export function isShowcasePlan(plan: unknown, status: unknown, periodEndsAt: unknown, now = Date.now()) {
  if (status !== "active" || (plan !== "flex" && plan !== "care")) return false;
  if (typeof periodEndsAt !== "string") return false;
  return new Date(periodEndsAt).getTime() > now;
}

export function customSectionLimit(plan: unknown) {
  if (plan === "flex") return 5;
  if (plan === "care") return null;
  return 0;
}

export function showcaseSlug(value: unknown, fallback = "project") {
  const slug = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}
