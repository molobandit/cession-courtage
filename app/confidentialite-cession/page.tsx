import { GeneratedDocumentView } from "@/components/documents/generated-document";
import { buildConfidentialityAgreement, type DocumentParty } from "@/lib/direct/documents";

export const metadata = {
  title: "Engagement de confidentialité",
  description: "L’engagement accepté par les deux parties au moment du dépôt de positionnement.",
};

const PARTIE: DocumentParty = {
  legalName: "le cabinet",
  legalForm: null,
  siren: null,
  address: null,
  postalCode: null,
  city: null,
  oriasNumber: null,
  representative: null,
  jobTitle: null,
  email: null,
};

/**
 * Le texte de l'engagement, lisible avant de cocher la case.
 *
 * Une case « j'accepte » dont on ne peut pas lire l'objet n'engage personne :
 * le texte est celui que le dossier de cession archive ensuite, nommément.
 */
export default function ConfidentialityTermsPage() {
  const doc = buildConfidentialityAgreement({
    dealId: "modele",
    reference: "Modèle",
    portfolioLabel: "le portefeuille présenté dans l’annonce",
    salePrice: 0,
    upfrontPercent: 80,
    escrow: true,
    seller: { ...PARTIE, legalName: "Le cabinet cédant" },
    buyer: { ...PARTIE, legalName: "Le cabinet acquéreur" },
    carriers: [],
    effectiveDate: null,
    deedSignedAt: null,
    issuedAt: new Date(),
  });
  return (
    <GeneratedDocumentView
      doc={{ ...doc, title: "Engagement de confidentialité", subtitle: "Texte accepté en un clic, archivé nommément dans chaque dossier de cession" }}
      issuedAt={new Date()}
      backHref="/annonces"
      backLabel="Retour aux annonces"
    />
  );
}
