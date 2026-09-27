import assert from "node:assert/strict";
import { analyzePortfolio, type PortfolioAnalysisInput } from "../lib/portfolio-analysis.ts";

const empty: PortfolioAnalysisInput = {
  fullName: "Jane Doe",
  headline: "",
  professionalSummary: "",
  email: "jane@example.com",
  phone: "",
  city: "",
  country: "",
  portfolioSlug: "jane-doe",
  experiences: [],
  education: [],
  items: [],
  showcases: [],
  customSections: [],
};

const starting = analyzePortfolio(empty);
assert.equal(starting.label, "Starting point");
assert.equal(starting.categories.reduce((total, item) => total + item.score, 0), starting.score);
assert.equal(starting.categories.reduce((total, item) => total + item.maximum, 0), 100);
assert.equal(starting.actions[0]?.id, "experience");
assert.ok(starting.actions.every((action, index, rows) => index === 0 || rows[index - 1].impact >= action.impact));

const strong = analyzePortfolio({
  ...empty,
  headline: "Customer Success and Digital Engagement Analyst | Revenue Recovery and Campaign Analytics",
  professionalSummary: "I turn customer and campaign data into practical decisions. My experience spans customer success, digital engagement and dashboard reporting, with a focus on finding commercial gaps and making performance easier to act on. I have supported revenue recovery, built reporting views for stakeholders and improved how teams understand opportunity and engagement data. I bring a commercially grounded approach, clear communication and hands-on experience across Power BI, Salesforce and Excel.",
  phone: "+44 7000 000000",
  city: "Newcastle",
  country: "United Kingdom",
  experiences: [
    { role: "Digital Engagement Analyst", company: "Example", startDate: "2025-04", endDate: "2026-08", isCurrent: false, description: "Built campaign and opportunity reporting that helped identify and recover $400k in revenue while giving stakeholders a clearer view of engagement performance." },
    { role: "Customer Success Analyst", company: "Example Two", startDate: "2023-07", endDate: "2025-04", isCurrent: false, description: "Supported customer success workflows, reporting and account engagement across a portfolio of software customers." },
  ],
  education: [{ institution: "University", qualification: "MSc", field: "Business Analytics", description: "" }],
  items: [
    ...["Power BI", "Salesforce", "Excel", "Analytics", "Customer Success", "Reporting"].map((title) => ({ itemType: "skill", title, subtitle: "", description: "", url: "", level: "" })),
    { itemType: "project", title: "Revenue recovery dashboard", subtitle: "", description: "Connected campaign and opportunity signals so stakeholders could identify commercial gaps and act on them.", url: "https://example.com/project", level: "" },
    { itemType: "link", title: "LinkedIn", subtitle: "", description: "", url: "https://linkedin.com/in/jane", level: "" },
  ],
  showcases: [{ id: "showcase-1", sourceType: "project", sourceId: "project-1", slug: "revenue-recovery", title: "Revenue recovery dashboard", summary: "A commercial analytics case study.", challenge: "Teams could not see the relationship between engagement and opportunities.", approach: "I connected campaign and opportunity reporting into one decision view.", outcome: "The workflow supported $400k in recovered revenue.", links: [{ id: "link-1", label: "Live result", url: "https://example.com/case-study", kind: "live" }], media: [], isEnabled: true }],
  customSections: [],
});

assert.ok(strong.score > starting.score);
assert.ok(strong.score >= 85);
assert.equal(strong.label, "Standout evidence");
assert.ok(strong.strengths.some((strength) => strength.includes("measurable")));
assert.equal(strong.actions.some((action) => action.id === "outcomes"), false);
