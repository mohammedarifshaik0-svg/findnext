import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-09-13T00:00:00.000Z");
  return ["", "/about", "/contact", "/terms", "/privacy", "/refund-policy"].map((path) => ({
    url: `https://www.thevxl.com${path}`,
    lastModified: updated,
    changeFrequency: path ? "monthly" as const : "weekly" as const,
    priority: path ? 0.7 : 1,
  }));
}
