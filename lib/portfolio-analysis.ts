import type { CustomSection, PortfolioShowcase } from "@/lib/phase2-showcases";

export const PORTFOLIO_ANALYSIS_ENABLED = process.env.NEXT_PUBLIC_VXL_PHASE2_ANALYSIS === "true";

export type PortfolioAnalysisInput = {
  fullName: string;
  headline: string;
  professionalSummary: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  portfolioSlug: string;
  experiences: Array<{ role: string; company: string; startDate: string; endDate: string; isCurrent: boolean; description: string }>;
  education: Array<{ institution: string; qualification: string; field: string; description: string }>;
  items: Array<{ itemType: string; title: string; subtitle: string; description: string; url: string; level: string }>;
  showcases: PortfolioShowcase[];
  customSections: CustomSection[];
};

export type PortfolioAnalysisCategory = {
  id: "positioning" | "credibility" | "proof" | "discoverability";
  label: string;
  score: number;
  maximum: number;
  detail: string;
};

export type PortfolioAnalysisAction = {
  id: string;
  title: string;
  detail: string;
  tab: "profile" | "experience" | "education" | "extras" | "showcases";
  impact: number;
};

export type PortfolioAnalysis = {
  score: number;
  label: "Starting point" | "Taking shape" | "Recruiter ready" | "Standout evidence";
  summary: string;
  categories: PortfolioAnalysisCategory[];
  strengths: string[];
  actions: PortfolioAnalysisAction[];
};

const quantified = /(?:\d[\d,.]*\s?(?:%|k|m|bn|x|\+)?|£\s?\d|\$\s?\d|₹\s?\d)/i;
const genericHeadline = /^(student|fresher|professional|job seeker|looking for opportunities)$/i;
const validHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

function category(id: PortfolioAnalysisCategory["id"], label: string, score: number, maximum: number, detail: string): PortfolioAnalysisCategory {
  return { id, label, score: Math.min(maximum, Math.max(0, score)), maximum, detail };
}

export function analyzePortfolio(input: PortfolioAnalysisInput): PortfolioAnalysis {
  const completeExperiences = input.experiences.filter((row) => row.role.trim() && row.company.trim());
  const detailedExperiences = completeExperiences.filter((row) => row.description.trim().length >= 80);
  const quantifiedExperiences = completeExperiences.filter((row) => quantified.test(row.description));
  const completeEducation = input.education.filter((row) => row.institution.trim() && (row.qualification.trim() || row.field.trim()));
  const skills = input.items.filter((item) => item.itemType === "skill" && item.title.trim());
  const projects = input.items.filter((item) => item.itemType === "project" && item.title.trim());
  const detailedProjects = projects.filter((item) => item.description.trim().length >= 60);
  const proofLinks = input.items.filter((item) => item.url.trim() && validHttpUrl(item.url));
  const enabledShowcases = input.showcases.filter((item) => item.isEnabled && item.title.trim());
  const richShowcases = enabledShowcases.filter((item) => item.challenge.trim() && item.approach.trim() && item.outcome.trim());
  const showcaseEvidence = enabledShowcases.reduce((total, item) => total + item.links.filter((link) => validHttpUrl(link.url)).length + item.media.length, 0);
  const visibleCustomEntries = input.customSections.filter((section) => section.isVisible).reduce((total, section) => total + section.items.filter((item) => item.title.trim()).length, 0);
  const headline = input.headline.trim();
  const summary = input.professionalSummary.trim();

  let positioningScore = 0;
  if (input.fullName.trim()) positioningScore += 3;
  if (headline.length >= 20) positioningScore += 5;
  if (headline.length >= 45 && !genericHeadline.test(headline)) positioningScore += 4;
  if (summary.length >= 80) positioningScore += 6;
  if (summary.length >= 300) positioningScore += 4;
  if (/\b(I|my|me)\b/i.test(summary)) positioningScore += 3;

  let credibilityScore = 0;
  if (completeExperiences.length) credibilityScore += 8;
  if (completeExperiences.length >= 2) credibilityScore += 4;
  if (detailedExperiences.length) credibilityScore += 7;
  if (quantifiedExperiences.length) credibilityScore += 7;
  if (completeExperiences.some((row) => row.startDate && (row.isCurrent || row.endDate))) credibilityScore += 4;

  let proofScore = 0;
  if (skills.length >= 3) proofScore += 4;
  if (skills.length >= 6) proofScore += 2;
  if (projects.length) proofScore += 5;
  if (detailedProjects.length) proofScore += 4;
  if (proofLinks.length) proofScore += 4;
  if (enabledShowcases.length) proofScore += 5;
  if (richShowcases.length) proofScore += 4;
  if (showcaseEvidence > 0) proofScore += 4;
  if (visibleCustomEntries > 0) proofScore += 2;

  let discoverabilityScore = 0;
  if (input.email.trim()) discoverabilityScore += 4;
  if (input.phone.trim()) discoverabilityScore += 2;
  if (input.city.trim() && input.country.trim()) discoverabilityScore += 3;
  if (input.portfolioSlug.trim().length >= 3) discoverabilityScore += 2;
  if (completeEducation.length) discoverabilityScore += 2;
  if (proofLinks.length >= 2) discoverabilityScore += 2;

  const categories = [
    category("positioning", "Positioning", positioningScore, 25, "How quickly a recruiter can understand who you are and where you add value."),
    category("credibility", "Credibility", credibilityScore, 30, "How well your experience supports the claims made in your introduction."),
    category("proof", "Proof of work", proofScore, 30, "Projects, outcomes, links and evidence that make your work inspectable."),
    category("discoverability", "Discoverability", discoverabilityScore, 15, "Contact, location, education and links that help people act on interest."),
  ];
  const score = categories.reduce((total, item) => total + item.score, 0);

  const actions: PortfolioAnalysisAction[] = [];
  if (headline.length < 45 || genericHeadline.test(headline)) actions.push({ id: "headline", title: "Sharpen your headline", detail: "Name your professional identity and the value area you want to be known for.", tab: "profile", impact: 9 - Math.min(5, headline.length >= 20 ? 5 : 0) });
  if (summary.length < 300) actions.push({ id: "summary", title: "Build a clearer opening story", detail: "Use a focused summary that connects your experience, strengths and direction without generic claims.", tab: "profile", impact: summary.length >= 80 ? 4 : 10 });
  if (!completeExperiences.length) actions.push({ id: "experience", title: "Add credible experience", detail: "Add at least one complete role with employer, dates and what you actually owned.", tab: "experience", impact: 19 });
  else if (!detailedExperiences.length) actions.push({ id: "experience-detail", title: "Turn duties into evidence", detail: "Explain the problem, your contribution and the result for at least one role.", tab: "experience", impact: 7 });
  if (completeExperiences.length && !quantifiedExperiences.length) actions.push({ id: "outcomes", title: "Add one supported outcome", detail: "Where truthful, include a percentage, amount, volume, time saved or other measurable result.", tab: "experience", impact: 7 });
  if (skills.length < 3) actions.push({ id: "skills", title: "Add your core skills", detail: "List at least three skills that are supported by your work and match your intended direction.", tab: "extras", impact: 4 });
  if (!projects.length) actions.push({ id: "projects", title: "Show one real project", detail: "Add a project with context, what you did and what changed because of it.", tab: "extras", impact: 9 });
  else if (!detailedProjects.length) actions.push({ id: "project-detail", title: "Explain the work behind a project", detail: "Add enough detail for a recruiter to understand your decisions and contribution.", tab: "extras", impact: 4 });
  if (projects.length && !enabledShowcases.length) actions.push({ id: "showcase", title: "Turn your strongest project into a Showcase", detail: "Create a case study with challenge, approach, outcome and supporting proof.", tab: "showcases", impact: 13 });
  else if (enabledShowcases.length && (!richShowcases.length || showcaseEvidence < 1)) actions.push({ id: "showcase-proof", title: "Strengthen your Showcase evidence", detail: "Complete the case-study story and add a screenshot, document or verified external link.", tab: "showcases", impact: 8 });
  if (!completeEducation.length) actions.push({ id: "education", title: "Complete your education", detail: "Add the institution and qualification so visitors can verify your background.", tab: "education", impact: 2 });
  if (!input.city.trim() || !input.country.trim()) actions.push({ id: "location", title: "Add your location", detail: "A city and country give recruiters immediate context for opportunities and time zones.", tab: "profile", impact: 3 });
  actions.sort((a, b) => b.impact - a.impact);

  const strengths = [
    quantifiedExperiences.length ? "Your experience includes measurable evidence." : "",
    richShowcases.length ? `${richShowcases.length} complete Showcase${richShowcases.length === 1 ? "" : "s"} make your work inspectable.` : "",
    proofLinks.length >= 2 ? "Multiple proof links let visitors verify your work." : "",
    skills.length >= 6 ? "Your skills coverage gives recruiters useful search context." : "",
    summary.length >= 300 && headline.length >= 45 ? "Your opening story establishes a clear professional direction." : "",
    completeExperiences.length >= 2 ? "Your career history shows useful depth." : "",
  ].filter(Boolean).slice(0, 4);

  const label = score >= 85 ? "Standout evidence" : score >= 70 ? "Recruiter ready" : score >= 45 ? "Taking shape" : "Starting point";
  const summaryText = score >= 85
    ? "Your portfolio is clear, credible and backed by evidence. Keep the strongest proof current."
    : score >= 70
      ? "Your core story is ready to share. The recommendations below can make it more memorable."
      : score >= 45
        ? "The foundation is visible, but a recruiter still has to infer parts of your value and proof."
        : "Build the core story first: positioning, complete experience and one piece of proof.";

  return { score, label, summary: summaryText, categories, strengths, actions: actions.slice(0, 6) };
}
