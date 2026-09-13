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

export function partnerIsLive(id: PartnerId): boolean {
  switch (id) {
    case "stripe":
      return PARTNER_ADAPTERS.stripe && stripeConfigured();
    case "trustap":
      return PARTNER_ADAPTERS.trustap && Boolean(runtimeEnv("TRUSTAP_API_KEY"));
    case "yousign":
      return PARTNER_ADAPTERS.yousign && Boolean(runtimeEnv("YOUSIGN_API_KEY"));
    case "docusign":
      return PARTNER_ADAPTERS.docusign && Boolean(runtimeEnv("DOCUSIGN_API_KEY"));
    case "identity":
      return (
        PARTNER_ADAPTERS.identity &&
        Boolean(runtimeEnv("ONDORSE_API_KEY") ?? runtimeEnv("IDENTITY_API_KEY"))
      );
    case "financing":
      return (
        PARTNER_ADAPTERS.financing &&
        (runtimeEnv("CREDIPRO_LIVE") === "true" || runtimeEnv("FINANCING_PARTNER_LIVE") === "true")
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
