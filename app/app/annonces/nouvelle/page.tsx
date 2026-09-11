import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/app/member-page-header";
import { CreateListingForm } from "@/components/listing/listing-forms";
import { canSell, findMyPortfolio, getActor, isOriasVerified, listMyPortfolios } from "@/lib/authz";
import { formatEuro } from "@/lib/format/fr";

export const metadata = { title: "Nouvelle annonce" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; certifier?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/annonces/nouvelle");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { portfolio: portfolioId, certifier } = await searchParams;
  const portfolios = await listMyPortfolios(actor);
  const selected = portfolioId
    ? await findMyPortfolio(portfolioId, actor)
    : portfolios[0]
      ? await findMyPortfolio(portfolios[0].id, actor)
      : null;
  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <MemberPageHeader title="Nouvelle annonce">
          Importez d’abord un portefeuille pour publier sous alias.
        </MemberPageHeader>
        <Link
          href="/app/import"
          className="inline-flex min-h-11 items-center rounded-full bg-indigo px-5 text-[14px] font-semibold !text-white"
        >
          Importer un bordereau
        </Link>
      </main>
    );
  }
  const mid = selected.valuations[0] ? Number(selected.valuations[0].midValue) : Number(selected.annualCommissions) * 2.5;
  const asking = Math.min(200000, Math.max(2000, Math.round(mid)));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <MemberPageHeader title="Nouvelle annonce">
        {selected.label} · commissions {formatEuro(selected.annualCommissions)} / an
        {selected.valuations[0] ? ` · médiane ${formatEuro(selected.valuations[0].midValue)}` : ""}
        . Renseignez le cadre juridique, l’organisation et la conformité. Les PDF
        du cabinet se déposent ensuite sur la fiche.
      </MemberPageHeader>
      {portfolios.length > 1 ? (
        <p className="mt-2 text-sm">
          {portfolios.map((p) => (
            <Link key={p.id} href={`/app/annonces/nouvelle?portfolio=${p.id}`} className="mr-3 underline-offset-2 hover:underline">
              {p.label}
            </Link>
          ))}
        </p>
      ) : null}
      <div className="mt-4">
        <CreateListingForm
          portfolioId={selected.id}
          defaultAsking={String(asking)}
          defaultCertify={certifier === "1"}
        />
      </div>
    </main>
  );
}
