import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateListingForm } from "@/components/listing/listing-forms";
import { canSell, findMyPortfolio, getActor, isOriasVerified, listMyPortfolios } from "@/lib/authz";
import { formatEuro } from "@/lib/format/fr";

export const metadata = { title: "Nouvelle annonce" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/annonces/nouvelle");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { portfolio: portfolioId } = await searchParams;
  const portfolios = await listMyPortfolios(actor);
  const selected = portfolioId
    ? await findMyPortfolio(portfolioId, actor)
    : portfolios[0]
      ? await findMyPortfolio(portfolios[0].id, actor)
      : null;
  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-muted">Importez d&apos;abord un portefeuille.</p>
        <Link href="/app/import" className="text-sm underline-offset-2 hover:underline">
          Import
        </Link>
      </main>
    );
  }
  const mid = selected.valuations[0] ? Number(selected.valuations[0].midValue) : Number(selected.annualCommissions) * 2.5;
  const asking = Math.min(200000, Math.max(2000, Math.round(mid)));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-serif text-2xl text-navy">Nouvelle annonce</h1>
      <p className="mt-1 text-sm text-muted">
        {selected.label} · commissions {formatEuro(selected.annualCommissions)} / an
        {selected.valuations[0] ? ` · médiane ${formatEuro(selected.valuations[0].midValue)}` : ""}
      </p>
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
        <CreateListingForm portfolioId={selected.id} defaultAsking={String(asking)} />
      </div>
    </main>
  );
}
