import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const PUBLIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/ceder", priority: 0.9 },
  { path: "/acquerir", priority: 0.9 },
  { path: "/valoriser", priority: 0.9 },
  { path: "/annonces", priority: 0.8 },
  { path: "/tarifs", priority: 0.7 },
  { path: "/inscription", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    changeFrequency: "weekly" as const,
    priority: route.priority,
  }));
}
