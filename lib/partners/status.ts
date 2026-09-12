import "server-only";
import { stripeConfigured } from "@/lib/billing/stripe";
import { runtimeEnv } from "@/lib/runtime-env";
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
      return stripeConfigured();
    case "trustap":
      return Boolean(runtimeEnv("TRUSTAP_API_KEY"));
    case "yousign":
      return Boolean(runtimeEnv("YOUSIGN_API_KEY"));
    case "docusign":
      return Boolean(runtimeEnv("DOCUSIGN_API_KEY"));
    case "identity":
      return Boolean(runtimeEnv("IDENTITY_API_KEY"));
    case "financing":
      return runtimeEnv("FINANCING_PARTNER_LIVE") === "true";
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
