import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

export type ParsedExperience = {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

export type ParsedEducation = {
  id: string;
  institution: string;
  qualification: string;
  field: string;
  startDate: string;
  endDate: string;
  grade: string;
  description: string;
};

export type ParsedItem = {
  id: string;
  itemType: "skill" | "project" | "achievement" | "certification" | "language" | "link";
  title: string;
  subtitle: string;
  description: string;
  url: string;
  level: string;
  issuedAt: string;
};

export type ParsedResume = {
  fullName: string;
  headline: string;
  professionalSummary: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  items: ParsedItem[];
  detectedSections: string[];
  warnings: string[];
};

const SECTION_ALIASES: Record<string, string[]> = {
  summary: ["summary", "professional summary", "profile", "about me", "career objective", "objective"],
  experience: ["experience", "work experience", "professional experience", "employment", "employment history", "work history"],
  education: ["education", "academic background", "academic qualifications", "qualifications"],
  skills: ["skills", "technical skills", "core competencies", "competencies", "expertise", "toolkit", "tools"],
  projects: ["projects", "selected projects", "personal projects", "key projects"],
  achievements: ["achievements", "awards", "honors", "honours", "accomplishments"],
  certifications: ["certifications", "certificates", "licenses", "licences"],
  languages: ["languages", "language proficiency"],
};

const headingLookup = new Map(
  Object.entries(SECTION_ALIASES).flatMap(([section, aliases]) => aliases.map((alias) => [alias, section] as const)),
);
const DATE_RANGE = /((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s.'/-]*\d{2,4}|\b(?:19|20)\d{2}\b)\s*(?:-|–|—|to)\s*((?:present|current|now)|(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s.'/-]*\d{2,4}|\b(?:19|20)\d{2}\b))/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL = /(?:https?:\/\/|www\.)[^\s)]+/i;
const LINKED_URL = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)[^\s)]+/i;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const JOB_WORDS = /analyst|engineer|developer|designer|manager|consultant|specialist|associate|director|founder|officer|executive|architect|intern|lead|head|coordinator|administrator|scientist|accountant|strategist/i;
const COMPANY_WORDS = /limited|ltd\.?|inc\.?|llp|pvt|private|global|solutions|technologies|technology|systems|services|consulting|company|corp\.?|group|university|bank/i;
const DEGREE_WORDS = /bachelor|master|b\.?com|b\.?tech|b\.?e\.?|bba|mba|msc|m\.?sc|degree|diploma|certificate|phd|doctorate|higher secondary|intermediate/i;
const INSTITUTION_WORDS = /university|college|school|institute|academy/i;

const tidy = (value: string) => value
  .replace(/[•●▪◦►]/g, " ")
  .replace(/\u00a0/g, " ")
  .replace(/[ \t]+/g, " ")
  .trim();

const isHeading = (line: string) => headingLookup.get(line.toLowerCase().replace(/:$/, "").trim());
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function normaliseLines(text: string) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(tidy)
    .filter(Boolean)
    .slice(0, 2500);
}

function collectSections(lines: string[]) {
  const sections = new Map<string, string[]>();
  let current = "header";
  sections.set(current, []);
  for (const line of lines) {
    const heading = isHeading(line);
    if (heading) {
      current = heading;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    sections.get(current)?.push(line);
  }
  return sections;
}

function cleanPhone(value?: string) {
  if (!value) return "";
  const candidate = value.trim();
  const digits = candidate.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? candidate : "";
}

function parseMonth(value: string) {
  const match = value.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)?[\s.'/-]*((?:19|20)?\d{2})/i);
  if (!match) return "";
  let year = Number(match[2]);
  if (year < 100) year += year > 70 ? 1900 : 2000;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = match[1] ? months.findIndex((item) => match[1].toLowerCase().startsWith(item)) + 1 : 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dateFields(line: string) {
  const match = line.match(DATE_RANGE);
  if (!match) return { startDate: "", endDate: "", isCurrent: false };
  const isCurrent = /present|current|now/i.test(match[2]);
  return { startDate: parseMonth(match[1]), endDate: isCurrent ? "" : parseMonth(match[2]), isCurrent };
}

function blocksAroundDates(lines: string[]) {
  const indices = lines.flatMap((line, index) => DATE_RANGE.test(line) ? [index] : []);
  if (!indices.length) return [];
  return indices.map((dateIndex, position) => {
    const previousDate = position ? indices[position - 1] : -1;
    const nextDate = position < indices.length - 1 ? indices[position + 1] : lines.length;
    const start = Math.max(previousDate + 1, dateIndex - 2);
    const end = nextDate === lines.length ? lines.length : Math.max(dateIndex + 1, nextDate - 2);
    return { header: lines.slice(start, dateIndex).slice(-2), dateLine: lines[dateIndex], body: lines.slice(dateIndex + 1, end) };
  });
}

function parseExperiences(lines: string[]): ParsedExperience[] {
  return blocksAroundDates(lines).slice(0, 20).map(({ header, dateLine, body }) => {
    const first = header[0] ?? "";
    const second = header[1] ?? "";
    let role = first;
    let company = second;
    if (COMPANY_WORDS.test(first) || (JOB_WORDS.test(second) && !JOB_WORDS.test(first))) {
      company = first;
      role = second;
    }
    const { startDate, endDate, isCurrent } = dateFields(dateLine);
    return {
      id: makeId("exp"),
      company: company.replace(DATE_RANGE, "").trim(),
      role: role.replace(DATE_RANGE, "").trim(),
      location: "",
      startDate,
      endDate,
      isCurrent,
      description: body.join("\n").slice(0, 4000),
    };
  }).filter((row) => row.role || row.company);
}

function parseEducation(lines: string[]): ParsedEducation[] {
  const blocks = blocksAroundDates(lines);
  if (!blocks.length && lines.length) {
    const degreeIndex = lines.findIndex((line) => DEGREE_WORDS.test(line));
    const institutionIndex = lines.findIndex((line) => INSTITUTION_WORDS.test(line));
    return [{
      id: makeId("edu"),
      institution: institutionIndex >= 0 ? lines[institutionIndex] : "",
      qualification: degreeIndex >= 0 ? lines[degreeIndex] : "",
      field: "",
      startDate: "",
      endDate: "",
      grade: lines.find((line) => /gpa|cgpa|grade|percentage|%/i.test(line)) ?? "",
      description: lines.filter((_, index) => index !== degreeIndex && index !== institutionIndex).join("\n").slice(0, 2000),
    }];
  }
  return blocks.slice(0, 12).map(({ header, dateLine, body }) => {
    const institution = header.find((line) => INSTITUTION_WORDS.test(line)) ?? header[1] ?? "";
    const qualification = header.find((line) => DEGREE_WORDS.test(line)) ?? header[0] ?? "";
    const { startDate, endDate } = dateFields(dateLine);
    return {
      id: makeId("edu"),
      institution,
      qualification,
      field: "",
      startDate,
      endDate,
      grade: body.find((line) => /gpa|cgpa|grade|percentage|%/i.test(line)) ?? "",
      description: body.filter((line) => !/gpa|cgpa|grade|percentage|%/i.test(line)).join("\n").slice(0, 2000),
    };
  }).filter((row) => row.institution || row.qualification);
}

function listItems(lines: string[], itemType: ParsedItem["itemType"], limit = 30) {
  return lines
    .flatMap((line) => itemType === "skill" ? line.split(/[,|;·]/) : [line])
    .map(tidy)
    .filter((line) => line.length > 1 && line.length < 180)
    .slice(0, limit)
    .map((title) => ({ id: makeId("itm"), itemType, title, subtitle: "", description: "", url: "", level: "", issuedAt: "" }));
}

export async function extractResumeText(buffer: Buffer, contentType: string) {
  if (contentType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function parseResumeText(text: string): ParsedResume {
  const lines = normaliseLines(text);
  const sections = collectSections(lines);
  const header = sections.get("header") ?? lines.slice(0, 12);
  const email = lines.map((line) => line.match(EMAIL)?.[0]).find(Boolean) ?? "";
  const phone = cleanPhone(lines.map((line) => line.match(PHONE)?.[0]).find(Boolean));
  const urls = lines.map((line) => line.match(LINKED_URL)?.[0] ?? line.match(URL)?.[0]).filter((value): value is string => Boolean(value));
  const identityLines = header.filter((line) => !EMAIL.test(line) && !PHONE.test(line) && !URL.test(line));
  const fullName = identityLines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,80}$/.test(line) && line.split(/\s+/).length <= 6 && !JOB_WORDS.test(line)) ?? "";
  const headline = identityLines.find((line) => line !== fullName && line.length <= 140 && (JOB_WORDS.test(line) || identityLines.indexOf(line) <= 2)) ?? "";
  const locationLine = header.find((line) => line.includes(",") && !EMAIL.test(line) && !URL.test(line) && !PHONE.test(line));
  const [city = "", country = ""] = locationLine?.split(",").map(tidy).slice(-2) ?? [];
  const summary = sections.get("summary") ?? [];
  const items: ParsedItem[] = [
    ...listItems(sections.get("skills") ?? [], "skill", 40),
    ...listItems(sections.get("projects") ?? [], "project", 15),
    ...listItems(sections.get("achievements") ?? [], "achievement", 15),
    ...listItems(sections.get("certifications") ?? [], "certification", 15),
    ...listItems(sections.get("languages") ?? [], "language", 15),
    ...urls.slice(0, 10).map((url) => ({
      id: makeId("itm"),
      itemType: "link" as const,
      title: /linkedin/i.test(url) ? "LinkedIn" : /github/i.test(url) ? "GitHub" : "Website",
      subtitle: "",
      description: "",
      url: url.startsWith("http") ? url : `https://${url.replace(/^www\./, "")}`,
      level: "",
      issuedAt: "",
    })),
  ];

  const warnings: string[] = [];
  if (text.trim().length < 80) warnings.push("Very little text was detected. This may be a scanned résumé.");
  if (!sections.has("experience")) warnings.push("No clearly labelled experience section was found.");
  if (!sections.has("education")) warnings.push("No clearly labelled education section was found.");

  return {
    fullName,
    headline,
    professionalSummary: summary.join("\n").slice(0, 4000),
    email,
    phone,
    city,
    country,
    experiences: parseExperiences(sections.get("experience") ?? []),
    education: parseEducation(sections.get("education") ?? []),
    items,
    detectedSections: [...sections.keys()].filter((key) => key !== "header"),
    warnings,
  };
}
