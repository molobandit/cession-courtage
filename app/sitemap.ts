import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const PUBLIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/ceder", priority: 0.9 },
  { path: "/acquerir", priority: 0.9 },
  { path: "/valoriser", priority: 0.9 },
  { path: "/annonces", priority: 0.8 },
  { path: "/annonces/demandes", priority: 0.7 },
  { path: "/investisseurs", priority: 0.8 },
  { path: "/certification", priority: 0.7 },
  { path: "/tarifs", priority: 0.7 },
  { path: "/faq", priority: 0.8 },
  { path: "/journal", priority: 0.6 },
  { path: "/mentions-legales", priority: 0.3 },
  { path: "/conditions-generales", priority: 0.3 },
  { path: "/confidentialite", priority: 0.3 },
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
