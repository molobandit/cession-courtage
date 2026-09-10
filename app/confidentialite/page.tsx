import type { Metadata } from "next";
import { LegalLayout, LegalRow, LegalSection } from "@/components/legal/legal-page";
import { DATA_AUTHORITY, PUBLISHER } from "@/lib/legal/entity";
import { REGLES } from "@/lib/rgpd/conservation";

function dureeLisible(jours: number): string {
  if (jours <= 2) return jours === 1 ? "24 heures" : `${jours} jours`;
  if (jours % 365 === 0) {
    const ans = jours / 365;
    return ans === 1 ? "12 mois" : `${ans} ans`;
  }
  if (jours === 3650) return "10 ans";
  if (jours === 1095) return "3 ans";
  if (jours % 30 === 0) return `${jours / 30} mois`;
  return `${jours} jours`;
}

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Données traitées, bases légales, durées de conservation et exercice de vos droits.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      eyebrow="Données personnelles"
      title="Politique de confidentialité"
      intro="Traitements mis en œuvre au titre du règlement général sur la protection des données."
    >
      <LegalSection title="Principe directeur : aucune donnée nominative de client final">
        <p>
          La plateforme traite des données professionnelles de courtiers, et des
          données de portefeuille volontairement dépourvues de tout élément
          nominatif. À l’import, les colonnes de nom, prénom, adresse électronique,
          téléphone, adresse postale et identifiant bancaire sont refusées, sur la
          base d’une analyse des en-têtes et du contenu des cellules.
        </p>
        <p>
          Le grain géographique maximal conservé est le code postal. Les contrats
          d’un même client sont regroupés par une clé calculée de manière
          irréversible, qui permet de mesurer la concentration sans jamais
          identifier une personne.
        </p>
      </LegalSection>

      <LegalSection title="Responsable de traitement">
        <div>
          <LegalRow label="Responsable" value={PUBLISHER.legalName} />
          <LegalRow label="Adresse" value={PUBLISHER.address} />
          <LegalRow label="Contact" value={PUBLISHER.email} />
        </div>
      </LegalSection>

      <LegalSection title="Données traitées et finalités">
        <div>
          <LegalRow
            label="Identification du courtier"
            value="Nom professionnel, adresse électronique, téléphone, numéro ORIAS, cabinet de rattachement"
          />
          <LegalRow
            label="Données de portefeuille"
            value="Code postal, branche, type de contrat, prime, commission, dates, sinistres agrégés"
          />
          <LegalRow
            label="Données de transaction"
            value="Annonces, mandats, offres, étapes de dossier, documents déposés"
          />
          <LegalRow
            label="Journalisation"
            value="Accès à la salle de données et aux données identifiantes, horodatés"
          />
        </div>
        <p>
          Ces traitements poursuivent trois finalités : vérifier l’éligibilité
          professionnelle des utilisateurs, permettre la mise en relation et le
          déroulement d’une cession, et assurer la traçabilité exigée par la nature
          de l’opération.
        </p>
      </LegalSection>

      <LegalSection title="Bases légales">
        <div>
          <LegalRow
            label="Exécution du contrat"
            value="Compte, annonces, mandats, offres, suivi de dossier"
          />
          <LegalRow
            label="Obligation légale"
            value="Vérification de l’immatriculation, conservation des pièces de la transaction"
          />
          <LegalRow
            label="Intérêt légitime"
            value="Sécurité du service, prévention des usages abusifs, journalisation des accès"
          />
        </div>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <p>
          Chaque durée ci-dessous est appliquée automatiquement : une purge
          quotidienne supprime ce qui a dépassé son terme. Le tableau est
          engendré à partir des règles effectivement exécutées, il ne peut donc
          pas s’en écarter.
        </p>
        <div>
          {REGLES.map((r) => (
            <LegalRow
              key={r.donnee}
              label={r.donnee}
              value={`${dureeLisible(r.jours)} — ${r.motif}`}
            />
          ))}
        </div>
        <p>
          Les données de portefeuille sont supprimées sans délai sur demande, et
          aucune donnée nominative de client final n’est collectée : le grain le
          plus fin est le code postal.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires">
        <p>
          Les données ne sont ni vendues, ni louées, ni transmises à des fins
          publicitaires. L’identité d’un cédant n’est communiquée à un acquéreur
          qu’à la signature de la lettre d’intention, et jamais avant.
        </p>
        <p>
          Les prestataires de vérification d’identité, de signature électronique et
          de séquestre sont, à ce stade, des interfaces simulées : aucune donnée
          n’est transmise à un tiers à ce titre. Aucune coordonnée bancaire n’est
          collectée.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le site ne dépose aucun cookie de mesure d’audience, de publicité ou de
          réseau social. Seul un cookie de session, strictement nécessaire au
          fonctionnement de l’authentification, est utilisé. Il ne requiert pas de
          consentement préalable et aucune bannière n’est donc affichée.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de
          limitation, d’opposition et de portabilité. L’accès et la portabilité
          s’exercent immédiatement depuis la page « Mon compte » de votre espace
          membre : le bouton « Télécharger mes données » vous remet un fichier
          contenant l’ensemble des informations vous concernant. La suppression
          du compte s’y trouve également.
        </p>
        <p>
          L’effacement retire votre identité : nom, adresse électronique,
          téléphone et numéro ORIAS. Les pièces contractuelles de vos dossiers
          clos sont conservées sans vous désigner, l’article 17.3 du règlement
          réservant les données nécessaires à l’exécution d’un contrat et à la
          défense d’un droit en justice. Un dossier encore ouvert suspend la
          demande jusqu’à sa clôture.
        </p>
        <p>
          Les autres droits, notamment la rectification d’une information que
          vous ne pouvez pas modifier vous-même, s’exercent par courrier
          électronique à l’adresse de l’éditeur.
        </p>
        <p>
          En cas de désaccord persistant, vous pouvez introduire une réclamation
          auprès de la {DATA_AUTHORITY.name} ({DATA_AUTHORITY.shortName}),{" "}
          {DATA_AUTHORITY.address}, {DATA_AUTHORITY.website}.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Les mots de passe sont conservés sous forme d’empreinte dérivée, jamais en
          clair. Les droits d’accès sont appliqués au niveau des requêtes et non de
          l’affichage : un utilisateur qui devine un identifiant n’obtient rien.
          Chaque consultation de la salle de données est journalisée et visible des
          deux parties.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
