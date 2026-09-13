import "server-only";
import { stripeConfigured } from "@/lib/billing/stripe";
import { runtimeEnv } from "@/lib/runtime-env";
import { PARTNER_ADAPTERS } from "@/lib/partners/adapters";
import {
  LIVE_BADGE,
  PARTNERS,
  READY_BADGE,
  type PartnerCopy,
  type PartnerId,
} from "@/lib/partners/catalog";

export type PresentedPartner = PartnerCopy & {
  live: boolean;
  badge: string;
};

/**
 * Verrou de production, partenaire par partenaire.
 *
 * Même règle que pour Stripe : un compte de test ne déplace rien, un compte de
 * production bloque de vrais fonds ou envoie de vraies pièces. Déclarer
 * `<PARTENAIRE>_ENV=production` ne suffit donc pas ; il faut aussi
 * `<PARTENAIRE>_ALLOW_LIVE=true`, posé exprès. Sans cela, coller une clé de
 * production par erreur ferait séquestrer de l'argent sur un portefeuille de
 * démonstration.
 *
 * Environnement absent = bac à sable : c'est l'état sûr par défaut.
 */
export function productionUnlocked(prefix: string): boolean {
  const env = (runtimeEnv(`${prefix}_ENV`) ?? "sandbox").trim().toLowerCase();
  if (env !== "production") return true;
  return runtimeEnv(`${prefix}_ALLOW_LIVE`) === "true";
}

export function partnerIsLive(id: PartnerId): boolean {
  switch (id) {
    case "stripe":
      return PARTNER_ADAPTERS.stripe && stripeConfigured();
    case "trustap":
      return (
        PARTNER_ADAPTERS.trustap &&
        Boolean(runtimeEnv("TRUSTAP_API_KEY")) &&
        productionUnlocked("TRUSTAP")
      );
    case "yousign":
      return (
        PARTNER_ADAPTERS.yousign &&
        Boolean(runtimeEnv("YOUSIGN_API_KEY")) &&
        productionUnlocked("YOUSIGN")
      );
    case "docusign":
      return (
        PARTNER_ADAPTERS.docusign &&
        Boolean(runtimeEnv("DOCUSIGN_API_KEY")) &&
        productionUnlocked("DOCUSIGN")
      );
    case "identity":
      return (
        PARTNER_ADAPTERS.identity &&
        Boolean(runtimeEnv("ONDORSE_API_KEY") ?? runtimeEnv("IDENTITY_API_KEY")) &&
        productionUnlocked("IDENTITY")
      );
    case "financing":
      return (
        PARTNER_ADAPTERS.financing &&
        (runtimeEnv("CREDIPRO_LIVE") === "true" || runtimeEnv("FINANCING_PARTNER_LIVE") === "true") &&
        productionUnlocked("CREDIPRO")
      );
    default: {
      const _never: never = id;
      return Boolean(_never);
    }
  }
}

export function signatureProvider(): "yousign" | "docusign" {
  return runtimeEnv("SIGNATURE_PROVIDER") === "docusign" ? "docusign" : "yousign";
}

export function presentPartners(): PresentedPartner[] {
  return PARTNERS.map((partner) => {
    const live = partnerIsLive(partner.id);
    return { ...partner, live, badge: live ? LIVE_BADGE : READY_BADGE };
  });
}

export function escrowRailLive(): boolean {
  return partnerIsLive("trustap");
}

export function signatureRailLive(): boolean {
  return partnerIsLive(signatureProvider());
}

export function identityRailLive(): boolean {
  return partnerIsLive("identity");
}
