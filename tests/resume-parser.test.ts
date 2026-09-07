import assert from "node:assert/strict";
import { parseResumeText } from "../lib/resume-parser.ts";

const text = `
Alex Morgan
BUSINESS ANALYTICS AND CUSTOMER SUCCESS PROFESSIONAL
Newcastle upon Tyne, UK | +44 7000 000000 | alex@example.com

PROFESSIONAL PROFILE
Analytics professional who turns customer and commercial data into clear decisions using reporting and customer-success platforms.

SELECTED ACHIEVEMENTS
• Won the company analytics award in 2025.
• Recovered significant customer revenue through structured follow-up.

PROFESSIONAL EXPERIENCE
Digital Engagement Analyst | Northstar Global
Apr 2025 - Present
• Built Power BI reporting for Customer Success and Sales.
• Translated operational data into stakeholder-ready KPI views.
Associate Customer Success Analyst | Insight Systems
Jul 2023 - Apr 2025
• Analysed customer accounts and engagement activity.

EDUCATION
MSc Business Analytics | Newcastle University
Current
Developing advanced capability in analytics and business strategy.
Bachelor of Commerce Honours | City College
2023

INDEPENDENT PRODUCT PROJECTS
Sporthub | Live product
sporthub.example
• Designed and built a community-sports platform.
CareerKit | Career technology experiment
careerkit.example
• Explored clearer resume and job-search guidance.

SKILLS
Power BI | Business analytics | Excel | Salesforce
`;

const parsed = parseResumeText(text);
assert.equal(parsed.fullName, "Alex Morgan");
assert.equal(parsed.city, "Newcastle upon Tyne");
assert.equal(parsed.country, "UK");
assert.match(parsed.professionalSummary, /turns customer and commercial data/);
assert.equal(parsed.experiences.length, 2);
assert.equal(parsed.experiences[0].role, "Digital Engagement Analyst");
assert.equal(parsed.experiences[0].company, "Northstar Global");
assert.equal(parsed.experiences[0].isCurrent, true);
assert.equal(parsed.experiences[1].role, "Associate Customer Success Analyst");
assert.equal(parsed.education.length, 2);
assert.equal(parsed.education[0].qualification, "MSc Business Analytics");
assert.equal(parsed.education[0].institution, "Newcastle University");
assert.equal(parsed.items.filter((item) => item.itemType === "achievement").length, 2);
assert.equal(parsed.items.filter((item) => item.itemType === "project").length, 2);
assert.equal(parsed.items.filter((item) => item.itemType === "skill").length, 4);

console.log("resume parser fixture passed", {
  experiences: parsed.experiences.length,
  education: parsed.education.length,
  projects: parsed.items.filter((item) => item.itemType === "project").length,
  achievements: parsed.items.filter((item) => item.itemType === "achievement").length,
  skills: parsed.items.filter((item) => item.itemType === "skill").length,
});
