import Link from "next/link";
import { redirect } from "next/navigation";
import { CompanyDocumentsPanel } from "@/components/listing/company-documents-panel";
import { getActor, isInvestor, isOriasVerified } from "@/lib/authz";
import { companyDocLabel } from "@/lib/listing/company-doc-kinds";
import { listCompanyDocs } from "@/lib/listing/company-docs";
import { depositReleasesIdentity } from "@/lib/listing/identity-access";
import { stripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Mes documents" };

/**
 * Les pièces que le dépôt a ouvertes, rangées par dossier.
 *
 * Un dossier n'apparaît que si le dépôt qui l'ouvre est reçu : c'est la même
 * règle que partout ailleurs, et la page ne montre donc jamais une liste de
 * pièces verrouillées.
 */
export default async function MesDocumentsPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/documents");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const paiementsActifs = stripeConfigured();
  const [depots, positions] = await Promise.all([
    prisma.interestDeposit.findMany({
      where: { buyerId: actor.id },
      select: { paymentStatus: true, listing: { select: { id: true, publicNumber: true, portfolio: { select: { label: true } } } } },
    }),
    isInvestor(actor)
      ? prisma.investorPosition.findMany({
          where: { investorId: actor.id },
          select: { paymentStatus: true, listing: { select: { id: true, publicNumber: true, portfolio: { select: { label: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  const ouverts = [...depots, ...positions].filter((row) =>
    depositReleasesIdentity(row.paymentStatus, paiementsActifs),
  );
  const dossiers = await Promise.all(
    ouverts.map(async (row) => ({
      listing: row.listing,
      docs: await listCompanyDocs(row.listing.id),
    })),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Mes documents</h1>
      <p className="mt-1 text-[15px] text-muted">Les pièces ouvertes par vos dépôts de positionnement.</p>

      {dossiers.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-paper p-8 text-center">
          <p className="text-[15px] leading-relaxed text-muted">
            Vos documents apparaîtront ici dès votre premier dépôt de positionnement.
          </p>
          <Link
            href="/annonces"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-indigo px-5 text-[15px] font-semibold !text-white hover:bg-indigo-dark"
          >
            Voir les portefeuilles
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          {dossiers.map(({ listing, docs }) => (
            <section key={listing.id} className="overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-[17px] font-semibold text-ink">Dossier n° {listing.publicNumber}</h2>
                  <p className="text-[13px] text-muted">{listing.portfolio.label}</p>
                </div>
                <Link href={`/annonces/${listing.publicNumber}`} className="text-[14px] font-medium text-indigo-dark">
                  Ouvrir la fiche
                </Link>
              </div>
              <div className="px-5 py-4">
                <Link
                  href={`/annonces/${listing.publicNumber}/cabinet`}
                  className="inline-flex h-11 items-center rounded-full border border-indigo-line bg-indigo-soft px-5 text-[14px] font-semibold text-indigo-dark hover:bg-indigo-soft/70"
                >
                  Présentation du cabinet
                </Link>
                {docs.length === 0 ? (
                  <p className="mt-4 text-[14px] text-muted">Le cédant n’a pas encore déposé de pièce.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-line">
                    {docs.map((doc) => (
                      <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <span className="text-[15px] text-ink">{companyDocLabel(doc.kind)}</span>
                        <Link
                          href={`/api/cabinet/${listing.id}/${doc.id}`}
                          className="text-[14px] font-medium text-indigo-dark hover:underline"
                        >
                          Télécharger
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
