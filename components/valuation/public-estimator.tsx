"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatEuroWhole, parseFrenchInput } from "@/lib/format/number";
import {
  PUBLIC_SEGMENT_LABELS,
  PUBLIC_SEGMENT_MULTIPLES,
  estimatePublicRange,
  type PublicSegment,
} from "@/lib/valuation/public-estimate";

const SEGMENTS: PublicSegment[] = ["INDIVIDUAL", "PROFESSIONAL", "COMPANY"];

export function PublicEstimator() {
  const [raw, setRaw] = useState("45 000");
  const [segment, setSegment] = useState<PublicSegment>("INDIVIDUAL");

  const commissions = parseFrenchInput(raw);
  const estimate = useMemo(
    () => estimatePublicRange(commissions ?? 0, segment),
    [commissions, segment],
  );

  const hasResult = estimate.mid > 0;

  return (
    <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="commissions" className="block text-[15px] font-medium text-ink">
            Commissions encaissées sur douze mois
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="commissions"
              inputMode="decimal"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              aria-describedby="commissions-aide"
              className="tabular h-12 w-full rounded-full border border-line bg-cream px-4 text-right text-lg text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep/60"
            />
            <span className="text-lg text-muted">€ HT</span>
          </div>
          <p id="commissions-aide" className="mt-2 text-sm text-muted">
            Le montant que vous avez réellement encaissé, pas les primes.
          </p>
        </div>

        <div>
          <span className="block text-[15px] font-medium text-ink">
            Clientèle dominante
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEGMENTS.map((key) => {
              const active = key === segment;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSegment(key)}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-full bg-charcoal px-4 py-2 text-[15px] font-medium text-cream"
                      : "rounded-full border border-line bg-cream px-4 py-2 text-[15px] text-ink hover:bg-paper"
                  }
                >
                  {PUBLIC_SEGMENT_LABELS[key]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-muted">
            Multiple public appliqué : {PUBLIC_SEGMENT_MULTIPLES[segment].toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        {hasResult ? (
          <>
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
              Fourchette indicative
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-line bg-cream p-5 text-right">
                <p className="text-sm text-muted">Basse</p>
                <p className="tabular mt-1 font-serif text-2xl font-semibold text-ink">
                  {formatEuroWhole(estimate.low)}
                </p>
              </div>
              <div className="rounded-3xl border border-gold-deep/40 bg-gold/15 p-5 text-right">
                <p className="text-sm text-muted">Médiane</p>
                <p className="tabular mt-1 font-serif text-2xl font-semibold text-ink">
                  {formatEuroWhole(estimate.mid)}
                </p>
              </div>
              <div className="rounded-3xl border border-line bg-cream p-5 text-right">
                <p className="text-sm text-muted">Haute</p>
                <p className="tabular mt-1 font-serif text-2xl font-semibold text-ink">
                  {formatEuroWhole(estimate.high)}
                </p>
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              Cette estimation applique un multiple moyen de marché à votre segment
              principal. Elle ne tient compte ni de votre taux de résiliation, ni de
              votre concentration compagnies, ni de l’ancienneté de vos contrats.
              La valorisation complète, qui détaille l’impact en euros de chacun de
              ces postes, se calcule après import de votre portefeuille.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="gold">
                <Link href="/inscription">Obtenir la valorisation détaillée</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/ceder">Comprendre le parcours</Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-[15px] text-muted">
            Saisissez un montant de commissions pour afficher la fourchette.
          </p>
        )}
      </div>
    </div>
  );
}
