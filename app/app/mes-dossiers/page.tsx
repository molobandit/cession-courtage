import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor, isInvestor, isOriasVerified } from "@/lib/authz";
import { formatDate } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { listMyInvestorPositions } from "@/lib/investor/positions";

export const metadata = { title: "Mes dossiers" };

export default async function MesDossiersPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/mes-dossiers");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!isInvestor(actor)) redirect("/app");

  const positions = await listMyInvestorPositions(actor);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-dark">
        Espace investisseur
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Mes dossiers</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Après un dépôt de {INTEREST_DEPOSIT_LABEL} du prix de cession, le cabinet cédant
        n’est plus sous alias. Les assurés du portefeuille restent anonymes. Cette
        page suit l’avancement de chaque opération, pas une prise de participation.
      </p>

      {positions.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-line bg-paper p-6 text-[15px] text-muted">
          Aucun dossier suivi pour le moment.{" "}
          <Link href="/investisseurs/opportunites" className="font-medium text-indigo underline-offset-2 hover:underline">
            Voir les opportunités
          </Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {positions.map((row) => {
            const zone = row.listing.isNationwide ? "France entière" : row.listing.displayedZone;
            const status = LISTING_STATUS_LABELS[row.listing.status] ?? row.listing.status;
            return (
              <li key={row.id} className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
                <p className="text-[13px] font-semibold text-indigo">
                  Dossier n° {row.listing.publicNumber}
                </p>
                <p className="mt-1 text-[16px] font-semibold text-ink">{zone}</p>
                <dl className="mt-4 grid gap-2 text-[14px] sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Avancement</dt>
                    <dd className="mt-0.5 font-medium text-ink">{status}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Identité du cabinet</dt>
                    <dd className="mt-0.5 font-medium text-ink">Ouverte</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Dépôt enregistré</dt>
                    <dd className="mt-0.5 tabular font-medium text-ink">
                      {formatEuroWhole(Number(row.depositAmount))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Positionnement</dt>
                    <dd className="mt-0.5 font-medium text-ink">{formatDate(row.createdAt)}</dd>
                  </div>
                </dl>
                <Link
                  href={`/annonces/${row.listing.publicNumber}?voie=investir`}
                  className="mt-4 inline-block text-[14px] font-medium text-indigo underline-offset-2 hover:underline"
                >
                  Ouvrir la fiche
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
