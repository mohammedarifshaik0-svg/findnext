import "server-only";

type VercelChallenge = { type?: unknown; domain?: unknown; value?: unknown; reason?: unknown };
type VercelDomain = { name?: string; verified?: boolean; verification?: VercelChallenge[] };
type VercelConfig = { misconfigured?: boolean; recommendedIPv4?: unknown[]; recommendedCNAME?: unknown[] };

function settings() {
  const token = process.env.VXL_VERCEL_TOKEN;
  const project = process.env.VXL_VERCEL_PROJECT_ID;
  const team = process.env.VXL_VERCEL_TEAM_ID;
  if (!token || !project) throw new Error("custom_domain_service_unconfigured");
  return { token, project, team };
}

async function vercelRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { token, team } = settings();
  const url = new URL(`https://api.vercel.com${path}`);
  if (team) url.searchParams.set("teamId", team);
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    const error = new Error(result.error?.message || `vercel_domain_request_${response.status}`);
    error.name = result.error?.code || String(response.status);
    throw error;
  }
  return result;
}

const projectPath = () => `/v10/projects/${encodeURIComponent(settings().project)}/domains`;
const legacyProjectPath = () => `/v9/projects/${encodeURIComponent(settings().project)}/domains`;

export function addVercelProjectDomain(domain: string) {
  return vercelRequest<VercelDomain>(projectPath(), { method: "POST", body: JSON.stringify({ name: domain }) });
}

export function verifyVercelProjectDomain(domain: string) {
  return vercelRequest<VercelDomain>(`${legacyProjectPath()}/${encodeURIComponent(domain)}/verify`, { method: "POST" });
}

export async function getVercelProjectDomain(domain: string) {
  const result = await vercelRequest<{ domains?: VercelDomain[] }>(`${legacyProjectPath()}?limit=100`);
  return (result.domains ?? []).find((item) => item.name?.toLowerCase() === domain.toLowerCase()) ?? null;
}

export function inspectVercelDomain(domain: string) {
  const { project } = settings();
  return vercelRequest<VercelConfig>(`/v6/domains/${encodeURIComponent(domain)}/config?projectIdOrName=${encodeURIComponent(project)}&strict=true`);
}

export async function removeVercelProjectDomain(domain: string) {
  try {
    return await vercelRequest<Record<string, unknown>>(`${legacyProjectPath()}/${encodeURIComponent(domain)}`, { method: "DELETE", body: JSON.stringify({ removeRedirects: false }) });
  } catch (error) {
    if (error instanceof Error && (error.name === "not_found" || error.name === "404")) return {};
    throw error;
  }
}

const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const recommendedValues = (values: unknown) => Array.isArray(values) ? values.flatMap((item) => {
  if (typeof item === "string") return [clean(item, 253)];
  if (item && typeof item === "object") {
    const value = clean((item as Record<string, unknown>).value, 253);
    return value ? [value] : [];
  }
  return [];
}).filter(Boolean) : [];

export function safeDomainState(domain: string, project: VercelDomain, config: VercelConfig) {
  const verification = (Array.isArray(project.verification) ? project.verification : []).slice(0, 10).map((item) => ({
    type: clean(item.type, 20).toUpperCase(), domain: clean(item.domain, 253), value: clean(item.value), reason: clean(item.reason),
  })).filter((item) => item.type && item.value);
  const dnsRecords = [
    ...recommendedValues(config.recommendedIPv4).map((value) => ({ type: "A", name: domain, value })),
    ...recommendedValues(config.recommendedCNAME).map((value) => ({ type: "CNAME", name: domain, value })),
  ];
  const verified = Boolean(project.verified);
  const configured = config.misconfigured === false;
  return { status: verified && configured ? "active" as const : "verification_required" as const, vercelVerified: verified, dnsConfigured: configured, verification, dnsRecords };
}
