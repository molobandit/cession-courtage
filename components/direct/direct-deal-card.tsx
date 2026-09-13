import { DossierCard, type ToneName } from "@/components/app/toolbox";
import { readTransferCarriers } from "@/lib/direct/services";
import { progressPercent, stepByKey, type DirectStage } from "@/lib/direct/stages";
import { formatEuroWhole } from "@/lib/format/number";

export type DirectDealCardData = {
  id: string;
  portfolioLabel: string;
  salePrice: unknown;
  stage: string;
  kit: boolean;
  escrow: boolean;
  attestations: boolean;
  openedById: string;
  openerRole: string;
  counterpartyEmail: string;
  carriers: unknown;
  openedBy: { publicAlias: string };
  counterparty: { publicAlias: string } | null;
};

/** Couleur d'un dossier : celle de son service principal. */
export function directDealTone(d: { kit: boolean; escrow: boolean }): ToneName {
  if (d.kit) return "kit";
  if (d.escrow) return "escrow";
  return "attestations";
}

/**
 * Carte d'un dossier à la carte, vue par l'une de ses parties.
 *
 * La position se lit du point de vue de celui qui regarde : le cédant qui a
 * ouvert le dossier et l'acquéreur invité ne voient pas le même ruban.
 */
export function DirectDealCard({
  deal,
  viewerId,
  tone,
}: {
  deal: DirectDealCardData;
  viewerId: string;
  tone?: ToneName;
}) {
  const estOuvreur = deal.openedById === viewerId;
  const vendeur = estOuvreur ? deal.openerRole === "SELLER" : deal.openerRole === "BUYER";
  const autre = estOuvreur
    ? (deal.counterparty?.publicAlias ?? deal.counterpartyEmail)
    : deal.openedBy.publicAlias;
  const services = { kit: deal.kit, escrow: deal.escrow, attestations: deal.attestations };
  const carriers = readTransferCarriers(deal.carriers);
  const noms = [
    deal.kit ? "Kit contractuel" : null,
    deal.escrow ? "Transaction sécurisée" : null,
    deal.attestations && !deal.kit ? "Attestations de transfert" : null,
  ].filter(Boolean);
  const prix = Number(deal.salePrice);

  return (
    <DossierCard
      href={`/app/formaliser/${deal.id}`}
      ribbon={{ label: vendeur ? "Position Vendeur" : "Position Acheteur", icon: "user" }}
      tone={tone ?? directDealTone(deal)}
      title={deal.portfolioLabel}
      subtitle={`${vendeur ? "Acquéreur" : "Cédant"} : ${autre}`}
      percent={progressPercent(deal.stage as DirectStage, services)}
      bullets={[
        { text: `${noms.join(" + ")} · ${stepByKey(deal.stage as DirectStage).label}` },
        carriers.length > 0
          ? { text: carriers.map((c) => c.name).join(", ") }
          : { text: "Les compagnies ne sont pas encore définies", muted: true },
      ]}
      amount={prix > 0 ? formatEuroWhole(prix) : "Sans prix déclaré"}
    />
  );
}
