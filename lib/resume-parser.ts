import { CanvasFactory } from "pdf-parse/worker";
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
  summary: ["summary", "professional summary", "professional profile", "executive profile", "career profile", "profile", "about me", "career objective", "objective"],
  experience: ["experience", "work experience", "professional experience", "career experience", "employment", "employment history", "work history"],
  education: ["education", "academic background", "academic qualifications", "qualifications"],
  skills: ["skills", "technical skills", "core competencies", "competencies", "expertise", "toolkit", "tools"],
  projects: ["projects", "selected projects", "independent product projects", "product projects", "personal projects", "key projects"],
  achievements: ["achievements", "selected achievements", "awards", "awards and achievements", "honors", "honours", "accomplishments"],
  certifications: ["certifications", "certificates", "licenses", "licences"],
  languages: ["languages", "language proficiency"],
};

const normaliseHeading = (value: string) => value.toLowerCase().replace(/[&/]/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const headingLookup = new Map(
  Object.entries(SECTION_ALIASES).flatMap(([section, aliases]) => aliases.map((alias) => [normaliseHeading(alias), section] as const)),
);
const DATE_RANGE = /((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s.'/-]*\d{2,4}|\b(?:19|20)\d{2}\b)\s*(?:-|–|—|to)\s*((?:present|current|now)|(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s.'/-]*\d{2,4}|\b(?:19|20)\d{2}\b))/i;
const SINGLE_DATE = /^(?:present|current|now|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s.'/-]*\d{2,4}|(?:19|20)\d{2})$/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL = /(?:https?:\/\/|www\.)[^\s)]+/i;
const LINKED_URL = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)[^\s)]+/i;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const JOB_WORDS = /analyst|engineer|developer|designer|manager|consultant|specialist|associate|director|founder|officer|executive|architect|intern|lead|head|coordinator|administrator|scientist|accountant|strategist/i;
const COMPANY_WORDS = /limited|ltd\.?|inc\.?|llp|pvt|private|global|solutions|technologies|technology|systems|services|consulting|company|corp\.?|group|university|bank/i;
const DEGREE_WORDS = /\b(?:bachelor|master|b\.?\s?com|b\.?\s?tech|b\.?\s?e\.?|bba|mba|msc|m\.?\s?sc|degree|diploma|certificate|phd|doctorate|higher secondary|intermediate)\b/i;
const INSTITUTION_WORDS = /university|college|school|institute|academy/i;

const tidy = (value: string) => value
  .replace(/^\s*[•●▪◦►*-]\s*/, "• ")
  .replace(/\u00a0/g, " ")
  .replace(/[ \t]+/g, " ")
  .trim();

const isHeading = (line: string) => headingLookup.get(normaliseHeading(line));
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
    const nestedAchievementLabel = current === "experience" && heading === "achievements" && /:\s*$/.test(line);
    if (heading && !nestedAchievementLabel) {
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

function splitColumns(line: string) {
  return line.split(/\s*[|｜]\s*/).map(tidy).filter(Boolean);
}

function datedBlocks(lines: string[], matchesDate: (line: string) => boolean) {
  const dateIndices = lines.flatMap((line, index) => matchesDate(line) ? [index] : []);
  return dateIndices.map((dateIndex, position) => {
    let headerIndex = dateIndex - 1;
    while (headerIndex >= 0 && (lines[headerIndex].startsWith("• ") || matchesDate(lines[headerIndex]))) headerIndex -= 1;
    const nextDateIndex = dateIndices[position + 1] ?? lines.length;
    let nextHeaderIndex = nextDateIndex - 1;
    while (nextHeaderIndex > dateIndex && (lines[nextHeaderIndex].startsWith("• ") || matchesDate(lines[nextHeaderIndex]))) nextHeaderIndex -= 1;
    if (nextDateIndex === lines.length) nextHeaderIndex = lines.length;
    return {
      header: headerIndex >= 0 ? lines[headerIndex] : "",
      dateLine: lines[dateIndex],
      body: lines.slice(dateIndex + 1, Math.max(dateIndex + 1, nextHeaderIndex)).filter((line) => !matchesDate(line)),
    };
  });
}

function parseExperiences(lines: string[]): ParsedExperience[] {
  const roleHeaders = lines.flatMap((line, index) => {
    const firstColumn = splitColumns(line)[0] ?? "";
    return line.includes("|") && JOB_WORDS.test(firstColumn) ? [index] : [];
  });
  if (roleHeaders.length) return roleHeaders.slice(0, 20).map((start, position) => {
    const end = roleHeaders[position + 1] ?? lines.length;
    const columns = splitColumns(lines[start]);
    const role = columns[0] ?? "";
    const company = columns[1] ?? "";
    const trailing = columns.slice(2);
    const dateParts = trailing.filter((part) => SINGLE_DATE.test(part) || DATE_RANGE.test(part));
    const location = trailing.filter((part) => !SINGLE_DATE.test(part) && !DATE_RANGE.test(part)).join(", ");
    let cursor = start + 1;
    while (cursor < end && dateParts.length < 2 && (SINGLE_DATE.test(lines[cursor]) || DATE_RANGE.test(lines[cursor]))) {
      dateParts.push(lines[cursor]); cursor += 1;
    }
    const combinedDate = dateParts.length > 1 && !DATE_RANGE.test(dateParts[0]) ? `${dateParts[0]} - ${dateParts[1]}` : dateParts[0] ?? "";
    const { startDate, endDate, isCurrent } = dateFields(combinedDate);
    return { id: makeId("exp"), company, role, location, startDate, endDate, isCurrent, description: lines.slice(cursor, end).map((line) => line.replace(/^•\s*/, "")).join("\n").slice(0, 4000) };
  });
  return datedBlocks(lines, (line) => DATE_RANGE.test(line)).slice(0, 20).map(({ header, dateLine, body }) => {
    const columns = splitColumns(header.replace(DATE_RANGE, "").trim());
    let role = columns[0] ?? "";
    let company = columns[1] ?? "";
    let location = columns[2] ?? "";
    if (columns.length === 1) {
      const nearby = lines.slice(Math.max(0, lines.indexOf(header) - 1), lines.indexOf(header));
      const second = nearby.at(-1) ?? "";
      if (COMPANY_WORDS.test(role) || (JOB_WORDS.test(second) && !JOB_WORDS.test(role))) {
        company = role; role = second;
      } else if (second && !second.startsWith("• ")) company = second;
    }
    if (company.includes(",") && !location) {
      const companyParts = company.split(",").map(tidy);
      company = companyParts.shift() ?? company;
      location = companyParts.join(", ");
    }
    const { startDate, endDate, isCurrent } = dateFields(dateLine);
    return { id: makeId("exp"), company, role, location, startDate, endDate, isCurrent, description: body.map((line) => line.replace(/^•\s*/, "")).join("\n").slice(0, 4000) };
  }).filter((row) => row.role || row.company);
}

function parseEducation(lines: string[]): ParsedEducation[] {
  const degreeStarts = lines.flatMap((line, index) => DEGREE_WORDS.test(line) ? [index] : []);
  if (degreeStarts.length) return degreeStarts.slice(0, 12).map((start, position) => {
    const end = degreeStarts[position + 1] ?? lines.length;
    const columns = splitColumns(lines[start]);
    let qualification = columns[0] ?? lines[start];
    const body = lines.slice(start + 1, end);
    if ((qualification.match(/\(/g)?.length ?? 0) > (qualification.match(/\)/g)?.length ?? 0) && body[0]) qualification = `${qualification} ${body.shift()}`;
    const institution = columns.find((line) => INSTITUTION_WORDS.test(line)) ?? body.find((line) => INSTITUTION_WORDS.test(line)) ?? "";
    const dateSource = [qualification, ...body].find((line) => DATE_RANGE.test(line) || SINGLE_DATE.test(line) || /graduated\s*:/i.test(line)) ?? "";
    const range = DATE_RANGE.test(dateSource) ? dateFields(dateSource) : { startDate: /intake|planned/i.test(qualification) ? parseMonth(qualification) : "", endDate: /current|present|now/i.test(dateSource) ? "" : parseMonth(dateSource), isCurrent: /current|present|now/i.test(dateSource) };
    const grade = body.find((line) => /gpa|cgpa|grade|percentage|%/i.test(line))?.replace(/^•\s*/, "") ?? "";
    const description = body.filter((line) => line !== institution && line !== dateSource && !/gpa|cgpa|grade|percentage|%/i.test(line)).map((line) => line.replace(/^•\s*/, "")).join("\n").slice(0, 2000);
    return { id: makeId("edu"), institution, qualification, field: "", startDate: range.startDate, endDate: range.endDate, grade, description };
  }).filter((row) => row.institution || row.qualification);
  const blocks = datedBlocks(lines, (line) => DATE_RANGE.test(line) || SINGLE_DATE.test(line));
  if (!blocks.length && lines.length) {
    const degreeIndex = lines.findIndex((line) => DEGREE_WORDS.test(line));
    const institutionIndex = lines.findIndex((line) => INSTITUTION_WORDS.test(line));
    return [{ id: makeId("edu"), institution: institutionIndex >= 0 ? lines[institutionIndex] : "", qualification: degreeIndex >= 0 ? lines[degreeIndex] : "", field: "", startDate: "", endDate: "", grade: lines.find((line) => /gpa|cgpa|grade|percentage|%/i.test(line)) ?? "", description: "" }];
  }
  return blocks.slice(0, 12).map(({ header, dateLine, body }) => {
    const columns = splitColumns(header);
    const qualification = columns.find((line) => DEGREE_WORDS.test(line)) ?? columns[0] ?? "";
    const institution = columns.find((line) => INSTITUTION_WORDS.test(line)) ?? columns.find((line) => line !== qualification) ?? "";
    const { startDate, endDate, isCurrent } = DATE_RANGE.test(dateLine) ? dateFields(dateLine) : { startDate: "", endDate: /current|present|now/i.test(dateLine) ? "" : parseMonth(dateLine), isCurrent: /current|present|now/i.test(dateLine) };
    return {
      id: makeId("edu"), institution, qualification, field: "", startDate, endDate, grade: body.find((line) => /gpa|cgpa|grade|percentage|%/i.test(line))?.replace(/^•\s*/, "") ?? "",
      description: body.filter((line) => !/gpa|cgpa|grade|percentage|%/i.test(line)).map((line) => line.replace(/^•\s*/, "")).join("\n").slice(0, 2000),
      ...(isCurrent ? { endDate: "" } : {}),
    };
  }).filter((row) => row.institution || row.qualification);
}

function listItems(lines: string[], itemType: ParsedItem["itemType"], limit = 30) {
  return lines
    .flatMap((line) => itemType === "skill" ? line.split(/[,|;·]/) : [line])
    .map((line) => tidy(line).replace(/^•\s*/, ""))
    .filter((line) => line.length > 1 && line.length < 180)
    .slice(0, limit)
    .map((title) => ({ id: makeId("itm"), itemType, title, subtitle: "", description: "", url: "", level: "", issuedAt: "" }));
}

function parseProjects(lines: string[]): ParsedItem[] {
  const starts = lines.flatMap((line, index) => line.includes("|") && !line.startsWith("• ") ? [index] : []);
  if (!starts.length) return listItems(lines, "project", 15);
  return starts.slice(0, 15).map((start, position) => {
    const end = starts[position + 1] ?? lines.length;
    const columns = splitColumns(lines[start]);
    const body = lines.slice(start + 1, end);
    const url = body.map((line) => line.match(URL)?.[0]).find(Boolean) ?? "";
    return {
      id: makeId("itm"), itemType: "project" as const, title: columns[0] ?? "", subtitle: columns.slice(1).join(" · "),
      description: body.filter((line) => !URL.test(line) && !/^github$/i.test(line)).map((line) => line.replace(/^•\s*/, "")).join("\n").slice(0, 4000),
      url: url ? (url.startsWith("http") ? url : `https://${url.replace(/^www\./, "")}`) : "", level: "", issuedAt: "",
    };
  });
}

export async function extractResumeText(buffer: Buffer, contentType: string) {
  if (contentType === "application/pdf") {
    const parser = new PDFParse({ data: buffer, CanvasFactory });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  const [raw, rich] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);
  const linkedUrls = [...rich.value.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi)]
    .map((match) => `${match[2].replace(/<[^>]+>/g, "").trim()} ${match[1]}`)
    .filter((value, index, values) => value && values.indexOf(value) === index);
  return [raw.value, ...linkedUrls].join("\n");
}

export function parseResumeText(text: string): ParsedResume {
  const lines = normaliseLines(text);
  const sections = collectSections(lines);
  const header = (sections.get("header") ?? lines.slice(0, 12)).slice(0, 12);
  const email = lines.map((line) => line.match(EMAIL)?.[0]).find(Boolean) ?? "";
  const phone = cleanPhone(lines.map((line) => line.match(PHONE)?.[0]).find(Boolean));
  const urls = lines.map((line) => line.match(LINKED_URL)?.[0] ?? line.match(URL)?.[0]).filter((value): value is string => Boolean(value));
  const identityLines = header.filter((line) => !EMAIL.test(line) && !PHONE.test(line) && !URL.test(line));
  const fullName = identityLines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,80}$/.test(line) && line.split(/\s+/).length <= 6 && !JOB_WORDS.test(line)) ?? "";
  const headline = identityLines.find((line) => line !== fullName && line.length <= 140 && (JOB_WORDS.test(line) || identityLines.indexOf(line) <= 2)) ?? "";
  const contactLine = header.find((line) => EMAIL.test(line) || PHONE.test(line));
  const contactColumns = contactLine ? splitColumns(contactLine) : [];
  const fallbackLocation = header.find((line) => line.includes(",") && line.length < 120 && !EMAIL.test(line) && !URL.test(line) && !PHONE.test(line));
  const locationLine = contactColumns.find((line) => !EMAIL.test(line) && !PHONE.test(line) && !URL.test(line))
    ?? (fallbackLocation ? splitColumns(fallbackLocation)[0] : undefined);
  const locationParts = locationLine?.split(",").map(tidy).filter(Boolean) ?? [];
  const country = locationParts.length > 1 ? locationParts.pop() ?? "" : "";
  const city = locationParts.join(", ") || (locationLine && contactColumns.includes(locationLine) ? locationLine : "");
  const summary = sections.get("summary") ?? [];
  const items: ParsedItem[] = [
    ...listItems(sections.get("skills") ?? [], "skill", 40),
    ...parseProjects(sections.get("projects") ?? []),
    ...listItems(sections.get("achievements") ?? [], "achievement", 15),
    ...listItems(sections.get("certifications") ?? [], "certification", 15),
    ...listItems(sections.get("languages") ?? [], "language", 15),
    ...[...new Set(urls)].slice(0, 10).map((url) => ({
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
