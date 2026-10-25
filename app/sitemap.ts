import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const routes = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${siteUrl}/menu`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${siteUrl}/shop`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${siteUrl}/franchise`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${siteUrl}/careers`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.4 },
  ];

  return routes;
}
