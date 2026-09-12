import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdvanceStep } from "@/components/direct/advance-step";
import { getActor, isOriasVerified } from "@/lib/authz";
import { findMyDirectDeal } from "@/lib/direct/load";
import { feeLines, feesTotal } from "@/lib/direct/fees";
import {
  DIRECT_STEPS,
  nextStage,
  progressPercent,
  stagesFor,
  stepByKey,
  type DirectStage,
} from "@/lib/direct/stages";
import { formatEuroWhole } from "@/lib/format/number";

export const metadata = { title: "Dossier de gré à gré" };

export default async function DirectDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  const { id } = await params;
  if (!actor) redirect(`/connexion?next=/app/formaliser/${id}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const deal = await findMyDirectDeal(id, actor.id, actor.email);
  if (!deal) notFound();

  const services = { kit: deal.kit, escrow: deal.escrow, attestations: deal.attestations };
  const etape = deal.stage as DirectStage;
  const applicables = stagesFor(services);
  const avancement = progressPercent(etape, services);
  const suivante = nextStage(etape, services);

  const prix = Number(deal.salePrice);
  const sequestre = Math.round(prix * (Number(deal.upfrontPercent) / 100) * 100) / 100;
  const lignes = feeLines({ services, salePrice: prix, escrowedAmount: sequestre });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted">
        <Link href="/app/formaliser" className="underline-offset-2 hover:underline">
          Gré à gré
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        {deal.portfolioLabel}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {formatEuroWhole(prix)} · comptant {Number(deal.upfrontPercent)} % · avec{" "}
        {deal.counterpartyEmail}
      </p>

      {/* L'avancement se lit d'un coup d'œil : c'est la question qu'on se pose. */}
      <div className="mt-6 rounded-2xl border border-line bg-paper p-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[15px] font-semibold text-ink">
            {stepByKey(etape).label}
          </p>
          <p className="tabular text-[15px] font-semibold text-indigo">{avancement} %</p>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-alt"
          role="progressbar"
          aria-valuenow={avancement}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-indigo" style={{ width: `${avancement}%` }} />
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          {stepByKey(etape).summary}
        </p>
        {suivante ? (
          <div className="mt-5">
            <AdvanceStep
              dealId={deal.id}
              stage={suivante}
              label={stepByKey(suivante).label}
            />
          </div>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">Parcours</h2>
        <ol className="mt-4 grid gap-2">
          {DIRECT_STEPS.filter((s) => applicables.includes(s.key)).map((s) => {
            const rang = applicables.indexOf(s.key);
            const courant = applicables.indexOf(etape);
            const franchie = rang < courant;
            return (
              <li
                key={s.key}
                className={`rounded-xl border px-4 py-3 ${
                  s.key === etape
                    ? "border-indigo bg-indigo-soft/50"
                    : franchie
                      ? "border-line bg-surface-alt"
                      : "border-line bg-paper"
                }`}
              >
                <p className={`text-[15px] font-medium ${franchie ? "text-muted" : "text-ink"}`}>
                  {s.label}
                  {franchie ? " · fait" : ""}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{s.summary}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-[15px] font-semibold text-ink">Honoraires</h2>
        <ul className="mt-3 grid gap-1 text-[14px]">
          {lignes.map((l) => (
            <li key={l.key} className="flex justify-between gap-4">
              <span className="text-muted">
                {l.label} <span className="text-[12px]">· {l.detail}</span>
              </span>
              <span className="tabular text-ink">{formatEuroWhole(l.amount)} HT</span>
            </li>
          ))}
          <li className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-semibold">
            <span className="text-ink">Total</span>
            <span className="tabular text-ink">{formatEuroWhole(feesTotal(lignes))} HT</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
