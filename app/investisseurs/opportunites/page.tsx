import type { Metadata } from "next";
import Link from "next/link";
import { CertifiedBadge } from "@/components/listing/certified-badge";
import { InvestorInquiryForm } from "@/components/investor/inquiry-form";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";

export const metadata: Metadata = {
  title: "Opportunités investisseurs",
  description: "Consultez les opérations disponibles et positionnez-vous sous alias.",
  alternates: { canonical: "/investisseurs/opportunites" },
};

export default async function InvestorOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string }>;
}) {
  const { deal } = await searchParams;
  const listings = await loadPublicListingCards();
  const selected = listings.find((item) => String(item.publicNumber) === deal) ?? null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
        Espace investisseurs
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Opportunités</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Chaque opération est présentée sous alias. Aucune raison sociale, aucune
        donnée nominative de client final.
      </p>
      <ul className="mt-8 grid gap-5 md:grid-cols-2">
        {listings.map((item) => (
          <li key={item.id} className="rounded-xl border border-line bg-paper p-5">
            <p className="tabular text-[13px] font-semibold text-indigo">DEAL #{item.publicNumber}</p>
            <p className="mt-2 text-[15px] font-semibold text-ink">
              {item.isNationwide ? "France entière" : item.zone}
              {item.riskTypes[0] ? ` · ${item.riskTypes[0]}` : ""}
            </p>
            <ul className="mt-3 space-y-1 text-[14px] text-muted">
              <li>Clients / contrats : {formatCount(item.contractCount)}</li>
              <li>Commission annuelle : {formatEuroWhole(item.annualCommissions)}</li>
              <li>Prix de cession : {formatEuroWhole(item.askingPrice)}</li>
              <li>Statut : {item.certified ? "Portefeuille certifié" : "Annonce simple"}</li>
            </ul>
            {item.certified ? (
              <div className="mt-3">
                <CertifiedBadge compact />
              </div>
            ) : null}
            <Link
              href={`/investisseurs/opportunites?deal=${item.publicNumber}`}
              className="mt-4 inline-block text-[14px] font-medium text-indigo underline-offset-2 hover:underline"
            >
              Je souhaite me positionner
            </Link>
          </li>
        ))}
      </ul>
      {listings.length === 0 ? (
        <p className="mt-8 text-[15px] text-muted">Aucune opération n’est ouverte pour le moment.</p>
      ) : null}
      {selected ? (
        <section className="mt-12 rounded-xl border border-line bg-paper p-7">
          <h2 className="text-xl font-semibold text-ink">
            Positionnement sur DEAL #{selected.publicNumber}
          </h2>
          <div className="mt-6">
            <InvestorInquiryForm listingId={selected.id} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
