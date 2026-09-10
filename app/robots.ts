import type { MetadataRoute } from "next";
import { legalIdentityIncomplete } from "@/lib/legal/entity";
import { siteUrl } from "@/lib/site";

/**
 * Indexation conditionnee a l'identite legale.
 *
 * Tant que l'editeur n'est pas identifiable, le site refuse d'etre reference :
 * l'article 6-III de la loi pour la confiance dans l'economie numerique exige
 * cette identification, et un site commercial indexe sans elle expose son
 * auteur personnellement.
 *
 * Le verrou se leve tout seul le jour ou `lib/legal/entity.ts` est renseigne.
 * C'est volontaire : une bascule manuelle finit toujours par etre oubliee, et
 * dans le mauvais sens.
 */
export default function robots(): MetadataRoute.Robots {
  if (legalIdentityIncomplete()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

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
