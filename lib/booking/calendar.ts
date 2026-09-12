import {
  ADVISOR_TZ,
  formatParisSlot,
  parisDateKey,
  parisWeekdayIso,
} from "@/lib/booking/time";

/**
 * Mise en forme des créneaux pour le choix d'un rendez-vous.
 *
 * Tout est calculé côté serveur, en heure de Paris : le visiteur voit les
 * mêmes créneaux que le conseiller, où qu'il se trouve. Une mise en forme
 * côté client déclencherait cent vingt formatages Intl dans le navigateur et
 * pourrait basculer sur le fuseau de la machine.
 *
 * Fonctions pures, testables sans base ni rendu.
 */

export type BookingSlot = { startsAt: string; timeLabel: string };

export type BookingDay = {
  /** Clé de jour en heure de Paris, « 2026-09-14 ». */
  key: string;
  /** « Lundi 14 septembre », déjà capitalisé. */
  label: string;
  year: number;
  month: number;
  day: number;
  slots: BookingSlot[];
};

/** Case du calendrier. `day` à 0 = remplissage avant le 1er ou après le dernier. */
export type MonthCell = { key: string; day: number; available: boolean };

export type BookingMonth = { year: number; month: number; label: string };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Regroupe les créneaux par journée parisienne, dans l'ordre chronologique. */
export function groupSlotsByParisDay(
  slots: Array<{ startsAt: string; endsAt: string }>,
): BookingDay[] {
  const parJour = new Map<string, BookingDay>();

  for (const slot of slots) {
    const debut = new Date(slot.startsAt);
    const key = parisDateKey(debut);
    const { dayLabel, timeLabel } = formatParisSlot(debut, new Date(slot.endsAt));

    let jour = parJour.get(key);
    if (!jour) {
      const [year, month, day] = key.split("-").map(Number);
      jour = { key, label: dayLabel, year, month, day, slots: [] };
      parJour.set(key, jour);
    }
    jour.slots.push({ startsAt: slot.startsAt, timeLabel });
  }

  return [...parJour.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Nombre de jours du mois (month est 1-based). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Grille du mois en semaines de sept jours, lundi en tête.
 *
 * Lundi et non dimanche : c'est la semaine ISO, celle qu'attend un
 * professionnel français.
 */
export function monthGrid(
  year: number,
  month: number,
  availableKeys: ReadonlySet<string>,
): MonthCell[][] {
  const vide: MonthCell = { key: "", day: 0, available: false };
  const cases: MonthCell[] = [];

  const premierJourIso = parisWeekdayIso(year, month, 1);
  for (let i = 1; i < premierJourIso; i += 1) cases.push(vide);

  const total = daysInMonth(year, month);
  for (let jour = 1; jour <= total; jour += 1) {
    const key = `${year}-${pad(month)}-${pad(jour)}`;
    cases.push({ key, day: jour, available: availableKeys.has(key) });
  }

  while (cases.length % 7 !== 0) cases.push(vide);

  const semaines: MonthCell[][] = [];
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
  return semaines;
}

export function monthLabel(year: number, month: number): string {
  const libelle = new Intl.DateTimeFormat("fr-FR", {
    timeZone: ADVISOR_TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 15, 12)));
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}

/**
 * Mois à proposer à la navigation : uniquement ceux qui portent un créneau.
 *
 * Laisser feuilleter des mois vides donnerait l'impression d'un agenda fermé
 * alors qu'il ne l'est pas.
 */
export function bookingMonths(days: BookingDay[]): BookingMonth[] {
  const vus = new Map<string, BookingMonth>();
  for (const jour of days) {
    const cle = `${jour.year}-${pad(jour.month)}`;
    if (!vus.has(cle)) {
      vus.set(cle, { year: jour.year, month: jour.month, label: monthLabel(jour.year, jour.month) });
    }
  }
  return [...vus.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** Décalage de Paris affiché au visiteur, « UTC+2 » l'été. */
export function parisOffsetLabel(instant: Date, offsetMinutes: number): string {
  const signe = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const heures = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0
    ? `UTC${signe}${heures}`
    : `UTC${signe}${heures}:${pad(minutes)}`;
}
