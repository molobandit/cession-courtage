import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // L'espace membre et l'administration ne doivent jamais etre indexes.
        disallow: ["/app/", "/admin/", "/boite-demo", "/lien-envoye", "/connexion/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
