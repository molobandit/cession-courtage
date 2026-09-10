import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor, isOriasVerified } from "@/lib/authz";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { GROWTH_PLAN_ANNUAL_EUR } from "@/lib/billing/rates";
import { formatEuroWhole } from "@/lib/format/number";
import { EffacementForm } from "@/components/app/effacement-form";
import { KYC_STATUS_LABELS, ROLE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mon compte" };

export default async function ProfilPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/profil");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const [firm, subscribed] = await Promise.all([
    actor.firmId
      ? prisma.firm.findUnique({
          where: { id: actor.firmId },
          select: {
            legalName: true,
            legalForm: true,
            city: true,
            department: true,
            postalCode: true,
          },
        })
      : Promise.resolve(null),
    hasContactSubscription(actor),
  ]);

  const firstName = actor.fullName?.split(" ")[0] ?? "Courtier";
  const initial = firstName.charAt(0).toLocaleUpperCase("fr-FR");

  const identity = [
    { label: "Nom", value: actor.fullName ?? "Non renseigné" },
    { label: "E-mail", value: actor.email },
    { label: "Rôle", value: ROLE_LABELS[actor.role] },
    { label: "Numéro ORIAS", value: actor.oriasNumber },
    { label: "Identité (KYC)", value: KYC_STATUS_LABELS[actor.kycStatus] },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <section className="rounded-3xl bg-indigo-soft p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo text-lg font-semibold text-white"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Mon compte</h1>
            <p className="mt-1 text-[15px] leading-relaxed text-muted">
              Identité professionnelle et cabinet. L’alias reste affiché aux
              acquéreurs tant que le dépôt d’identité n’est pas versé.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Identité professionnelle</h2>
        <dl className="mt-4 divide-y divide-line">
          {identity.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3"
            >
              <dt className="text-[14px] text-muted">{row.label}</dt>
              <dd className="break-all text-[15px] font-medium text-ink sm:text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Alias public</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          C’est le seul nom visible tant que les identités ne sont pas levées.
        </p>
        <p className="mt-4 rounded-2xl bg-surface-alt px-4 py-3 text-[16px] font-semibold text-ink">
          {actor.publicAlias}
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Cabinet</h2>
        {firm ? (
          <dl className="mt-4 divide-y divide-line">
            <InfoRow label="Dénomination" value={firm.legalName} />
            <InfoRow label="Forme" value={firm.legalForm} />
            <InfoRow label="Zone" value={`${firm.postalCode} ${firm.city} (${firm.department})`} />
          </dl>
        ) : (
          <p className="mt-3 text-[15px] text-muted">
            Aucun cabinet rattaché pour le moment. Il sera associé à l’import
            d’un portefeuille.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Vos données</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Vous pouvez récupérer l’intégralité de vos données à tout moment, et
          demander la fermeture de votre compte. Vos interlocuteurs n’apparaissent
          dans l’export que sous leur alias : leur identité ne vous appartient pas.
        </p>
        <a
          href="/api/mes-donnees"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-indigo px-5 text-[14px] font-semibold !text-white"
        >
          Télécharger mes données
        </a>

        <div className="mt-8 border-t border-line pt-6">
          <h3 className="text-[15px] font-semibold text-ink">Supprimer mon compte</h3>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Votre identité est retirée et la connexion devient impossible. Les
            pièces de vos dossiers clos sont conservées sans vous désigner : la loi
            l’impose pour l’exécution des contrats et la défense des droits. Un
            dossier encore ouvert suspend la demande jusqu’à sa clôture.
          </p>
          <EffacementForm />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Abonnement</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {subscribed
            ? `Abonnement actif, ${formatEuroWhole(GROWTH_PLAN_ANNUAL_EUR)} HT par an. Le détail de l’offre (contact, messages, dépôt d’offre) est ouvert.`
            : `Accès gratuit : catalogue et dépôt d’annonce. L’abonnement, ${formatEuroWhole(GROWTH_PLAN_ANNUAL_EUR)} HT par an, ouvre le contact. Aucun encaissement sur cette démo.`}
        </p>
        <Link
          href="/tarifs#abonnements"
          className="mt-4 inline-flex min-h-11 items-center text-[14px] font-medium text-indigo-dark"
        >
          Voir les tarifs
        </Link>
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] font-medium text-ink sm:text-right">{value}</dd>
    </div>
  );
}
