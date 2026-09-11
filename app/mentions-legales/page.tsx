import type { Metadata } from "next";
import { LegalLayout, LegalRow, LegalSection } from "@/components/legal/legal-page";
import { HOST, PUBLISHER } from "@/lib/legal/entity";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Identité de l’éditeur, hébergement et propriété intellectuelle.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      eyebrow="Informations légales"
      title="Mentions légales"
      intro="Informations exigées par l’article 6-III de la loi pour la confiance dans l’économie numérique."
    >
      <LegalSection title="Éditeur du site">
        <div>
          <LegalRow label="Dénomination sociale" value={PUBLISHER.legalName} />
          <LegalRow label="Forme juridique" value={PUBLISHER.legalForm} />
          <LegalRow label="Capital social" value={PUBLISHER.shareCapital} />
          <LegalRow label="Numéro SIREN" value={PUBLISHER.siren} />
          <LegalRow label="Registre du commerce" value={PUBLISHER.rcsCity} />
          <LegalRow label="Numéro de TVA intracommunautaire" value={PUBLISHER.vatNumber} />
          <LegalRow label="Siège social" value={PUBLISHER.address} />
          <LegalRow label="Adresse électronique" value={PUBLISHER.email} />
          <LegalRow label="Téléphone" value={PUBLISHER.phone} />
          <LegalRow label="Directeur de la publication" value={PUBLISHER.publicationDirector} />
        </div>
      </LegalSection>

      <LegalSection title="Hébergement">
        <div>
          <LegalRow label="Hébergeur" value={HOST.name} />
          <LegalRow label="Adresse" value={HOST.address} />
          <LegalRow label="Site" value={HOST.website} />
        </div>
        <p>
          Les données de la plateforme sont stockées sur l’infrastructure de
          l’hébergeur. Le choix des localisations de traitement est décrit dans la
          politique de confidentialité.
        </p>
      </LegalSection>

      <LegalSection title="Nature du service">
        <p>
          La plateforme met en relation des intermédiaires en assurance
          immatriculés à l’ORIAS en vue de la cession ou de l’acquisition de
          portefeuilles de courtage, et des investisseurs qui suivent ces
          dossiers sous alias. Elle n’est ni partie à la transaction, ni
          mandataire de l’une des parties.
        </p>
        <p>
          Elle ne fournit aucun conseil en investissement, aucune recommandation
          personnalisée, et n’exerce aucune activité d’intermédiation en assurance
          au sens de l’article L. 511-1 du code des assurances. Les valorisations
          proposées sont indicatives et ne constituent ni une garantie de prix, ni
          une évaluation opposable aux tiers.
        </p>
        <p>
          Chaque partie demeure responsable de ses propres obligations
          réglementaires, notamment en matière d’immatriculation, de capacité
          professionnelle, d’assurance de responsabilité civile professionnelle et
          d’information de ses mandants.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          La structure du site, ses textes, sa charte graphique et sa méthode de
          valorisation sont protégés. Toute reproduction ou extraction, totale ou
          partielle, sans autorisation écrite préalable est interdite.
        </p>
        <p>
          Les contenus déposés par les utilisateurs restent leur propriété. Ils
          concèdent à l’éditeur le droit strictement nécessaire à l’exploitation du
          service, pour la durée de leur utilisation.
        </p>
      </LegalSection>

      <LegalSection title="Signalement d’un contenu">
        <p>
          Tout contenu manifestement illicite peut être signalé à l’adresse
          électronique de l’éditeur mentionnée ci-dessus, en précisant l’adresse de
          la page concernée et le motif du signalement.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
