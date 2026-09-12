import { formatEuroWhole } from "@/lib/format/number";
import type { CarrierLot } from "@/lib/listing/lots";

/**
 * Détail du portefeuille, fournisseur par fournisseur.
 *
 * C'est la vue qui décide d'un achat : un acquéreur regarde d'abord chez quels
 * assureurs se trouvent les commissions, parce que c'est là qu'il a — ou n'a
 * pas — déjà un code de courtage. Le total ne lui apprend rien de tout ça.
 *
 * C'est aussi la carte de la reprise partielle : chaque ligne est un lot
 * cessible séparément, et celles déjà engagées le disent.
 */
export function CarrierLots({
  lots,
  available,
}: {
  lots: CarrierLot[];
  /** Fournisseurs encore cessibles. Les autres portent déjà une cession. */
  available: string[];
}) {
  if (lots.length === 0) return null;

  const pris = lots.filter((lot) => !available.includes(lot.carrier)).length;

  return (
    <section className="rounded-3xl border border-line bg-paper p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold text-ink">
          Répartition par fournisseur
        </h2>
        <p className="text-[13px] text-muted">
          {lots.length} fournisseur{lots.length > 1 ? "s" : ""}
          {pris > 0 ? ` · ${pris} déjà cédé${pris > 1 ? "s" : ""}` : ""}
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
        Chaque fournisseur peut être repris séparément : c’est lui qui détient le code
        de courtage et signe l’attestation de transfert.
      </p>

      <ul className="mt-5 grid gap-2">
        {lots.map((lot) => {
          const libre = available.includes(lot.carrier);
          return (
            <li
              key={lot.carrier}
              className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-3 ${
                libre ? "border-line bg-page" : "border-line bg-surface-alt"
              }`}
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className={`truncate font-medium ${libre ? "text-ink" : "text-muted"}`}>
                  {lot.carrier}
                </span>
                {libre ? null : (
                  <span className="shrink-0 text-[12px] text-muted">déjà cédé</span>
                )}
              </span>
              <span className="flex shrink-0 items-baseline gap-4 text-[14px]">
                <span className="tabular text-muted">{lot.contractCount} contrats</span>
                <span className="tabular font-semibold text-ink">
                  {formatEuroWhole(lot.annualCommission)} / an
                </span>
                <span className="tabular w-10 text-right text-muted">
                  {Math.round(lot.share * 100)} %
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
