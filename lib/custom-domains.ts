export const CUSTOM_DOMAINS_ENABLED = process.env.NEXT_PUBLIC_VXL_PHASE2_CUSTOM_DOMAINS === "true";

const reservedSuffixes = ["thevxl.com", "vercel.app", "localhost"];

export function normalizeCustomDomain(input: unknown) {
  const raw = typeof input === "string" ? input.trim().toLowerCase().replace(/\.$/, "") : "";
  if (!raw || raw.includes("/") || raw.includes(":")) return null;
  try {
    const hostname = new URL(`https://${raw}`).hostname.toLowerCase().replace(/\.$/, "");
    if (hostname.length < 4 || hostname.length > 253 || !hostname.includes(".")) return null;
    const labels = hostname.split(".");
    if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return null;
    if (reservedSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) return null;
    return hostname;
  } catch {
    return null;
  }
}

export function requestHostname(headers: Headers) {
  return (headers.get("x-forwarded-host") || headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export function isVxlPlatformHost(hostname: string) {
  return !hostname
    || hostname === "thevxl.com"
    || hostname === "www.thevxl.com"
    || hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "[::1]"
    || hostname.endsWith(".vercel.app");
}

export function customDomainDestination(pathname: string, portfolioSlug: string) {
  if (!portfolioSlug || !/^\/[a-zA-Z0-9/_-]*$/.test(pathname)) return null;
  if (pathname === "/") return `/p/${portfolioSlug}`;
  if (pathname === "/resume" || pathname === "/photo") return `/p/${portfolioSlug}${pathname}`;
  if (pathname.startsWith("/showcase/")) return `/p/${portfolioSlug}${pathname}`;
  return null;
}
