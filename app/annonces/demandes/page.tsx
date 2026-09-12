import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicMandateList } from "@/components/mandate/public-mandate-list";
import { canBuy, getActor, isOriasVerified, listPublicMandates } from "@/lib/authz";
import { mapPublicMandateCard } from "@/lib/mandate/map-public";
import type { PublicMandateCard } from "@/lib/mandate/public";
import { acquisitionRequestHref } from "@/lib/nav/acquisition";

export const metadata: Metadata = {
  title: "Demandes d’acquisition",
  description:
    "Acquéreurs à la recherche d’un portefeuille de courtage : branches, zones, budget et commissions recherchées.",
  alternates: { canonical: "/annonces/demandes" },
};

export default async function PublicMandatesPage() {
  const [rows, actor] = await Promise.all([listPublicMandates(), getActor()]);
  const acquireHref = acquisitionRequestHref({
    loggedIn: Boolean(actor),
    canBuy: Boolean(actor && isOriasVerified(actor) && canBuy(actor)),
  });

  const mandates: PublicMandateCard[] = rows
    .map((m) => mapPublicMandateCard(m))
    .filter((m): m is PublicMandateCard => m !== null);

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
          <div className="mt-6">
            <Button asChild variant="primary">
              <Link href={acquireHref}>Déposer ma demande d’acquisition</Link>
            </Button>
          </div>
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
        <PublicMandateList mandates={mandates} acquireHref={acquireHref} />
      </div>
    </main>
  );
}
