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
    a: "Stripe règle l’abonnement annuel qui ouvre le contact et les messages. C’est le droit d’accès au marché, pas la transaction de cession. Les deux circuits sont séparés exprès : un incident sur l’abonnement ne touche pas le trust.",
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
    a: "Choisissez le prélèvement SEPA au moment de régler le dépôt de garantie : il n’a pas de plafond de carte et s’encaisse sous quelques jours. Les fonds de la cession passent par le trust, jamais par l’abonnement.",
  },
  {
    q: "Puis-je emprunter pour acheter ?",
    a: "Oui, via CrediPro dès que ce contrat sera validé : prêt d’acquisition ou refinancement d’un achat déjà payé comptant. En attendant, un entretien avec un conseiller aide à cadrer l’apport. Le prêt alimente le séquestre. Il ne le remplace pas.",
  },
];
