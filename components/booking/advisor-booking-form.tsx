"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import {
  createAdvisorBookingAction,
  type AdvisorBookingState,
} from "@/app/actions/advisor-booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { monthGrid, type BookingDay, type BookingMonth } from "@/lib/booking/calendar";

const initial: AdvisorBookingState = {};

const FIELD =
  "mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-[15px] text-ink";

const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Choix d'un rendez-vous en deux volets : calendrier du mois, puis horaires du
 * jour retenu.
 *
 * Les cent vingt créneaux s'affichaient auparavant à plat, tous les jours
 * dépliés en même temps : la page défilait sans fin et le formulaire se
 * trouvait hors de vue. Le calendrier tient dans un écran, ne montre que les
 * jours réellement ouverts, et les coordonnées n'apparaissent qu'une fois
 * l'heure choisie — l'ordre dans lequel un visiteur décide.
 *
 * Le champ `startsAt` reste un champ caché du même formulaire : l'action
 * serveur et sa validation ne changent pas.
 */
export function AdvisorBookingForm({
  days,
  months,
  timezoneLabel,
}: {
  days: BookingDay[];
  months: BookingMonth[];
  timezoneLabel: string;
}) {
  const [state, action, pending] = useActionState(createAdvisorBookingAction, initial);
  const [moisIndex, setMoisIndex] = useState(0);
  const [jourKey, setJourKey] = useState<string | null>(days[0]?.key ?? null);
  const [creneau, setCreneau] = useState<string | null>(null);

  const clesOuvertes = useMemo(() => new Set(days.map((d) => d.key)), [days]);
  const parCle = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  const mois = months[moisIndex];
  const grille = useMemo(
    () => (mois ? monthGrid(mois.year, mois.month, clesOuvertes) : []),
    [mois, clesOuvertes],
  );

  const jour = jourKey ? parCle.get(jourKey) ?? null : null;
  const creneauChoisi = jour?.slots.find((s) => s.startsAt === creneau) ?? null;

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-indigo bg-indigo-soft/50 p-8 text-center">
        <p className="text-[17px] font-semibold text-ink">Entretien confirmé</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
          Vous recevez la confirmation à l’adresse indiquée. Un conseiller vous
          attend à l’heure choisie.
        </p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <p className="text-[15px] leading-relaxed text-muted">
        Aucun créneau n’est ouvert pour le moment. Revenez un peu plus tard.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-8">
      <input type="hidden" name="startsAt" value={creneau ?? ""} />

      <div className="grid gap-8 lg:grid-cols-[1fr_15rem]">
        {/* Volet gauche : le mois. */}
        <div>
          <div className="flex items-center justify-between gap-4">
            <p aria-live="polite" className="text-[15px] font-semibold text-ink">
              {mois?.label}
            </p>
            {months.length > 1 ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMoisIndex((i) => Math.max(0, i - 1))}
                  disabled={moisIndex === 0}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink disabled:opacity-35"
                >
                  <span className="sr-only">Mois précédent</span>
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMoisIndex((i) => Math.min(months.length - 1, i + 1))}
                  disabled={moisIndex === months.length - 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink disabled:opacity-35"
                >
                  <span className="sr-only">Mois suivant</span>
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {JOURS_COURTS.map((initiale, i) => (
              <span
                key={`${initiale}-${i}`}
                aria-hidden="true"
                className="pb-2 text-[12px] font-semibold uppercase text-muted"
              >
                {initiale}
              </span>
            ))}
            {grille.flat().map((cellule, i) =>
              cellule.day === 0 ? (
                <span key={`vide-${i}`} aria-hidden="true" />
              ) : (
                <button
                  key={cellule.key}
                  type="button"
                  disabled={!cellule.available}
                  aria-pressed={cellule.key === jourKey}
                  aria-label={parCle.get(cellule.key)?.label ?? `${cellule.day}`}
                  onClick={() => {
                    setJourKey(cellule.key);
                    setCreneau(null);
                  }}
                  className={`tabular aspect-square rounded-full text-[14px] font-medium transition-colors ${
                    cellule.key === jourKey
                      ? "bg-indigo !text-white"
                      : cellule.available
                        ? "bg-indigo-soft text-indigo hover:bg-indigo hover:!text-white"
                        : "text-muted/45"
                  }`}
                >
                  {cellule.day}
                </button>
              ),
            )}
          </div>

          <p className="mt-5 text-[13px] text-muted">
            Entretien de 30 minutes · Heure de Paris ({timezoneLabel})
          </p>
        </div>

        {/* Volet droit : les horaires du jour retenu. */}
        <div className="lg:border-l lg:border-line lg:pl-8">
          <p className="text-[15px] font-semibold text-ink">
            {jour ? jour.label : "Choisissez un jour"}
          </p>
          {jour ? (
            <ul className="mt-4 grid max-h-[19rem] gap-2 overflow-y-auto pr-1">
              {jour.slots.map((slot) => (
                <li key={slot.startsAt}>
                  <button
                    type="button"
                    aria-pressed={slot.startsAt === creneau}
                    onClick={() => setCreneau(slot.startsAt)}
                    className={`tabular h-11 w-full rounded-lg border text-[14px] font-semibold transition-colors ${
                      slot.startsAt === creneau
                        ? "border-indigo bg-indigo !text-white"
                        : "border-line bg-paper text-indigo hover:border-indigo"
                    }`}
                  >
                    {slot.timeLabel}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[14px] text-muted">
              Les jours ouverts apparaissent en couleur.
            </p>
          )}
        </div>
      </div>

      {/*
        Les coordonnées ne s'affichent qu'une fois l'heure retenue : un
        formulaire complet offert d'emblée fait hésiter, et rien ne peut être
        envoyé sans créneau de toute façon.
      */}
      {creneauChoisi && jour ? (
        <div className="border-t border-line pt-8">
          <p className="text-[15px] text-ink">
            <span className="font-semibold">{jour.label}</span>, {creneauChoisi.timeLabel}{" "}
            <button
              type="button"
              onClick={() => setCreneau(null)}
              className="ml-1 text-[14px] text-indigo underline underline-offset-2"
            >
              changer
            </button>
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="fullName"
                className="text-[15px] font-medium normal-case tracking-normal text-ink"
              >
                Nom et prénom
              </Label>
              <Input id="fullName" name="fullName" required className={FIELD} />
            </div>
            <div>
              <Label
                htmlFor="organisation"
                className="text-[15px] font-medium normal-case tracking-normal text-ink"
              >
                Cabinet (facultatif)
              </Label>
              <Input id="organisation" name="organisation" className={FIELD} />
            </div>
            <div>
              <Label
                htmlFor="email"
                className="text-[15px] font-medium normal-case tracking-normal text-ink"
              >
                E-mail
              </Label>
              <Input id="email" name="email" type="email" required className={FIELD} />
            </div>
            <div>
              <Label
                htmlFor="phone"
                className="text-[15px] font-medium normal-case tracking-normal text-ink"
              >
                Téléphone
              </Label>
              <Input id="phone" name="phone" type="tel" className={FIELD} />
            </div>
          </div>

          <div className="mt-5">
            <Label
              htmlFor="purpose"
              className="text-[15px] font-medium normal-case tracking-normal text-ink"
            >
              Objet de l’entretien
            </Label>
            <select id="purpose" name="purpose" required className={FIELD}>
              <option value="">Choisir</option>
              <option value="DEPOSIT">Déposer un portefeuille</option>
              <option value="BUY">Acheter / se renseigner</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div className="mt-5">
            <Label
              htmlFor="note"
              className="text-[15px] font-medium normal-case tracking-normal text-ink"
            >
              Précision (facultatif)
            </Label>
            <textarea id="note" name="note" rows={3} className={`${FIELD} h-auto py-3`} />
          </div>

          {state.error ? (
            <p role="alert" className="mt-5 text-[15px] text-danger">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" className="mt-7 w-full sm:w-auto" disabled={pending}>
            {pending ? "Réservation…" : "Confirmer l’entretien"}
          </Button>
        </div>
      ) : (
        <p className="border-t border-line pt-6 text-[14px] text-muted">
          Choisissez un horaire pour renseigner vos coordonnées.
        </p>
      )}
    </form>
  );
}
