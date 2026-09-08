"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import {
  CARRIER_STATUS_LABELS,
  type CarrierCodeRow,
  type CarrierRisk,
  type CarrierStatus,
} from "@/lib/portfolio/carrier-codes";
import {
  setCarrierCodeStatusAction,
  type CarrierCodeState,
} from "@/app/actions/carrier-codes";

const STATUS_STYLE: Record<CarrierStatus, string> = {
  AGREED: "bg-ok/12 text-ok",
  NOTIFIED: "bg-gold/20 text-gold-deep",
  PENDING: "bg-cream text-muted",
  REFUSED: "bg-danger/10 text-danger",
};

const ORDER: CarrierStatus[] = ["PENDING", "NOTIFIED", "AGREED", "REFUSED"];

export function CarrierCodesPanel({
  portfolioId,
  rows,
  risk,
}: {
  portfolioId: string;
  rows: CarrierCodeRow[];
  risk: CarrierRisk;
}) {
  const [state, action, pending] = useActionState<CarrierCodeState, FormData>(
    setCarrierCodeStatusAction,
    {},
  );

  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl font-semibold text-ink">
        Transfert des codes de courtage
      </h2>
      <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted">
        Chaque compagnie doit accepter de réattribuer votre code à l’acquéreur.
        Sans cet accord, les commissions cessent après la signature. C’est le
        premier motif d’échec d’une cession, et il se traite avant le protocole.
      </p>

      {/* Ce que le suivi met en jeu, en euros. */}
      <div className="mt-5 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-5">
          <p className="text-sm text-muted">Commissions sécurisées</p>
          <p className="tabular mt-1.5 font-serif text-2xl font-semibold text-ok">
            {formatEuroWhole(risk.securedCommissions)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatCount(risk.agreed)} compagnie{risk.agreed > 1 ? "s" : ""} sur{" "}
            {formatCount(risk.total)}
          </p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm text-muted">En attente de réponse</p>
          <p className="tabular mt-1.5 font-serif text-2xl font-semibold text-ink">
            {formatEuroWhole(risk.atRiskCommissions)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatCount(risk.pending)} compagnie{risk.pending > 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm text-muted">Perdues sur refus</p>
          <p
            className={
              risk.lostCommissions > 0
                ? "tabular mt-1.5 font-serif text-2xl font-semibold text-danger"
                : "tabular mt-1.5 font-serif text-2xl font-semibold text-ink"
            }
          >
            {formatEuroWhole(risk.lostCommissions)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatCount(risk.refused)} refus
          </p>
        </div>
      </div>

      {state.error ? (
        <p className="mt-4 rounded-3xl border border-danger/40 bg-danger/5 p-4 text-[15px] text-ink">
          {state.error}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-6 py-4 text-[15px] font-semibold text-ink">
                Compagnie
              </th>
              <th scope="col" className="px-4 py-4 text-right text-[15px] font-semibold text-ink">
                Commissions
              </th>
              <th scope="col" className="px-4 py-4 text-right text-[15px] font-semibold text-ink">
                Part
              </th>
              <th scope="col" className="px-4 py-4 text-[15px] font-semibold text-ink">
                État
              </th>
              <th scope="col" className="px-6 py-4 text-[15px] font-semibold text-ink">
                Mettre à jour
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.carrier} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-6 py-4 text-[15px] font-normal text-ink">
                  {row.carrier}
                  <span className="block text-sm text-muted">
                    {formatCount(row.contracts)} contrat{row.contracts > 1 ? "s" : ""}
                  </span>
                </th>
                <td className="tabular px-4 py-4 text-right text-[15px] text-ink">
                  {formatEuroWhole(row.commissions)}
                </td>
                <td className="tabular px-4 py-4 text-right text-[15px] text-muted">
                  {(row.share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[row.status]}`}
                  >
                    {CARRIER_STATUS_LABELS[row.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <form action={action} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="portfolioId" value={portfolioId} />
                    <input type="hidden" name="carrier" value={row.carrier} />
                    <label className="sr-only" htmlFor={`statut-${row.carrier}`}>
                      État du code {row.carrier}
                    </label>
                    <select
                      id={`statut-${row.carrier}`}
                      name="status"
                      defaultValue={row.status}
                      className="h-10 rounded-full border border-line bg-cream px-3 text-[15px] text-ink"
                    >
                      {ORDER.map((status) => (
                        <option key={status} value={status}>
                          {CARRIER_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline" disabled={pending}>
                      {pending ? "En cours" : "Enregistrer"}
                    </Button>
                  </form>
                  {row.note ? (
                    <p className="mt-2 text-sm text-muted">{row.note}</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {risk.refused > 0 ? (
        <p className="mt-4 rounded-3xl border border-danger/40 bg-danger/5 p-5 text-[15px] leading-relaxed text-ink">
          {formatEuroWhole(risk.lostCommissions)} de commissions annuelles ne
          seront pas transférées. Signalez-le à l’acquéreur avant le protocole :
          découvert après la signature, ce point rouvre la négociation du prix.
        </p>
      ) : null}
    </section>
  );
}
