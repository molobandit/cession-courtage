import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import { SIMPLE_FEE_LABEL, VERIFIED_FEE_RANGE_LABEL } from "@/lib/billing/rates";
import { BRAND_NAME, CERTIFIED_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Portefeuille certifié",
  description: `Vérification de la société, pièces d’identité et documents. Honoraires de ${VERIFIED_FEE_RANGE_LABEL} si la vente aboutit. Séquestre jusqu’à la prise de possession.`,
  alternates: { canonical: "/certification" },
};

const STEPS = [
  {
    title: "Étape 1 — Identification du vendeur",
    items: [
      "Extrait Kbis ou justificatif d’immatriculation",
      "Informations légales de la société",
      "Justificatif d’identité du représentant légal",
      "Statuts ou documents juridiques pertinents",
      "Numéro ORIAS et justificatifs associés",
    ],
  },
  {
    title: "Étape 2 — Justification du portefeuille",
    items: [
      "États de portefeuille",
      "Relevés des compagnies",
      "Bordereaux et relevés de commissions",
      "États de production",
      "Répartition des clients et des contrats",
      "Données de renouvellement et de résiliation",
      "Documents concernant les précomptes, le cas échéant",
    ],
  },
  {
    title: "Étape 3 — Espace documentaire",
    items: [
      "Dépôt des pièces, classement par catégorie",
      "Documents obligatoires ou facultatifs",
      "Statuts reçu, à compléter, validé",
      "Commentaires de l’équipe et historique",
    ],
  },
  {
    title: "Étape 4 — Analyse interne",
    items: [
      "Revue des commissions, du mix et des compagnies",
      "Les pièces ne sont jamais accessibles publiquement",
    ],
  },
  {
    title: "Étape 5 — Rapport de certification",
    items: [
      `Attribution du label ${CERTIFIED_LABEL}`,
      `ou non-certification par ${BRAND_NAME}`,
    ],
  },
];

export default function CertificationPage() {
  return (
    <main>
      <PageIntro kicker="Due diligence" title="Faire certifier mon portefeuille">
        Nous vérifions la société, les pièces d’identité et les documents du
        portefeuille. Honoraires de {VERIFIED_FEE_RANGE_LABEL} si la vente
        aboutit. La salle de marché affiche un cachet CERTIFIÉ. Plus de 50 points
        de contrôle.
      </PageIntro>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-paper p-7">
          <h2 className="text-2xl font-bold tracking-tight text-ink">Annonce simple</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Les informations sont celles que vous déclarez. Nous ne relisons pas
            le Kbis, la pièce d’identité ni les bordereaux. {SIMPLE_FEE_LABEL} de
            commission. Le paiement transite quand même par le séquestre.
          </p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-7">
          <h2 className="text-2xl font-bold tracking-tight text-ink">Portefeuille certifié</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Contrôle de la société (Kbis), de l’identité du représentant, du
            justificatif ORIAS du dossier et des documents du portefeuille.
            Honoraires de {VERIFIED_FEE_RANGE_LABEL} si la vente aboutit. Le
            badge affiché est {CERTIFIED_LABEL}. Séquestre jusqu’à la prise de
            possession, sans frais de séquestre supplémentaires.
          </p>
        </article>
      </div>
      <ol className="mx-auto max-w-5xl space-y-4 px-4 pb-8">
        {STEPS.map((step) => (
          <li key={step.title} className="rounded-2xl border border-line bg-paper p-6">
            <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-muted">
              {step.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="mx-auto max-w-3xl px-4 pb-16 text-center">
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/inscription?voie=certifie">Demander la certification</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/annonces">Voir les portefeuilles certifiés</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
