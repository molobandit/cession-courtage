import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { TRANSACTION_SECURE_BODY } from "@/lib/copy/market";

export const PAYMENT_FAQ_ANCHOR = "paiement-et-signatures";

export const PAYMENT_FAQ: { q: string; a: string }[] = [
  {
    q: "Pourquoi un dépôt avant de voir qui vend ?",
    a: `Dès que l’acquéreur se positionne, il verse un dépôt de ${INTEREST_DEPOSIT_LABEL} dans un trust, pour lancer la procédure de cession. Ce montant s’impute sur la transaction. Il n’est pas un honoraire de la plateforme.`,
  },
  {
    q: "Où passent les fonds de la cession ?",
    a: TRANSACTION_SECURE_BODY,
  },
  {
    q: "À quoi sert Stripe alors ?",
    a: "Stripe encaisse le dépôt de positionnement de 2,5 %. Les fonds de la cession, eux, passent par le trust : les deux circuits sont séparés exprès.",
  },
  {
    q: "La signature sur le dossier est-elle déjà opposable ?",
    a: "Le parcours appelle Yousign, ou DocuSign si ce rail est choisi. Une signature électronique n’a la force prévue par le règlement européen qu’une fois le contrat prestataire validé. Avant cela, le bouton enregistre le consentement sur la plateforme, sans se présenter comme une signature qualifiée.",
  },
  {
    q: "Qui vérifie que j’existe vraiment ?",
    a: "Ondorse, dès validation du contrat, vérifie l’identité du cabinet et de son représentant.",
  },
  {
    q: "Mon plafond carte ne passe pas. Que faire ?",
    a: "Choisissez le prélèvement SEPA au moment de verser le dépôt de positionnement : il n’a pas de plafond de carte et s’encaisse sous quelques jours.",
  },
  {
    q: "Puis-je emprunter pour acheter ?",
    a: "Oui, via CrediPro dès que ce contrat sera validé : prêt d’acquisition ou refinancement d’un achat déjà payé comptant. En attendant, un entretien avec un conseiller aide à cadrer l’apport. Le prêt alimente le trust. Il ne le remplace pas.",
  },
];
