import type { Metadata } from "next";
import Link from "next/link";
import { PublicMandateList } from "@/components/mandate/public-mandate-list";
import { listPublicMandates } from "@/lib/authz";
import { asStringArray } from "@/lib/json-array";
import { FINANCING_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import type { PublicMandateCard } from "@/lib/mandate/public";

export const metadata: Metadata = {
  title: "Demandes d’acquisition",
  description:
    "Acquéreurs à la recherche d’un portefeuille de courtage : branches, zones, budget et commissions recherchées.",
  alternates: { canonical: "/annonces/demandes" },
};

export default async function PublicMandatesPage() {
  const rows = await listPublicMandates();

  const mandates: PublicMandateCard[] = rows.map((m) => {
    const zones = asStringArray(m.zones);
    return {
      id: m.id,
      publicNumber: m.publicNumber ?? 0,
      buyerAlias: m.buyer.publicAlias,
      maxBudget: Number(m.maxBudget),
      minCommissions: Number(m.minCommissions),
      maxCommissions: Number(m.maxCommissions),
      riskTypes: asStringArray(m.riskTypes).map(
        (r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r,
      ),
      carriers: asStringArray(m.carriers),
      zones: zones.filter((z) => z !== "NATIONAL"),
      clientSegments: asStringArray(m.clientSegments).map(
        (s) => SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s,
      ),
      financingLabel: FINANCING_LABELS[m.financingMode] ?? "Non précisé",
      isNationwide: zones.includes("NATIONAL"),
    };
  });

  return (
    <main>
      <section className="border-b border-line bg-indigo-soft text-ink">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Demandes d’acquisition
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight">
            Ils cherchent un portefeuille
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            Des acquéreurs ont déjà décrit ce qu’ils recherchent. Si votre
            portefeuille correspond, la demande existe avant même que vous publiiez.
            Les acquéreurs restent anonymes, comme les cédants.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Type d’annonce">
            <Link
              href="/annonces"
              className="rounded-full border border-line px-4 py-2 text-[15px] text-muted hover:border-indigo hover:text-indigo-dark"
            >
              Portefeuilles à céder
            </Link>
            <span className="rounded-full bg-indigo px-4 py-2 text-[15px] font-medium text-white">
              Demandes d’acquisition
            </span>
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <PublicMandateList mandates={mandates} />
      </div>
    </main>
  );
}
