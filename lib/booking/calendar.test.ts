import { describe, expect, it } from "vitest";
import {
  bookingMonths,
  daysInMonth,
  groupSlotsByParisDay,
  monthGrid,
  monthLabel,
  parisOffsetLabel,
} from "@/lib/booking/calendar";

/** 09:00 heure de Paris en été = 07:00 UTC. */
function creneau(iso: string, minutes = 30) {
  const debut = new Date(iso);
  return {
    startsAt: debut.toISOString(),
    endsAt: new Date(debut.getTime() + minutes * 60000).toISOString(),
  };
}

describe("regroupement par journée parisienne", () => {
  it("range les créneaux sous leur jour, dans l’ordre", () => {
    const jours = groupSlotsByParisDay([
      creneau("2026-09-15T07:00:00.000Z"),
      creneau("2026-09-14T12:00:00.000Z"),
      creneau("2026-09-14T07:00:00.000Z"),
    ]);
    expect(jours.map((j) => j.key)).toEqual(["2026-09-14", "2026-09-15"]);
    expect(jours[0].slots).toHaveLength(2);
  });

  it("affiche l’heure de Paris, pas l’heure UTC", () => {
    const [jour] = groupSlotsByParisDay([creneau("2026-09-14T07:00:00.000Z")]);
    expect(jour.slots[0].timeLabel).toBe("09:00 – 09:30");
  });

  it("capitalise le libellé du jour", () => {
    const [jour] = groupSlotsByParisDay([creneau("2026-09-14T07:00:00.000Z")]);
    expect(jour.label).toBe("Lundi 14 septembre");
  });

  it("rattache un créneau de fin de soirée au bon jour parisien", () => {
    // 22:30 UTC le 14 = 00:30 le 15 a Paris. Un regroupement fait sur l'heure
    // UTC le placerait la veille et le jour afficherait un creneau fantome.
    const [jour] = groupSlotsByParisDay([creneau("2026-09-14T22:30:00.000Z")]);
    expect(jour.key).toBe("2026-09-15");
  });
});

describe("grille du mois", () => {
  it("commence le lundi et cale le 1er au bon jour", () => {
    // 1er septembre 2026 = mardi : une seule case vide avant lui.
    const [semaine] = monthGrid(2026, 9, new Set());
    expect(semaine[0].day).toBe(0);
    expect(semaine[1].day).toBe(1);
  });

  it("rend des semaines complètes de sept jours", () => {
    for (const semaine of monthGrid(2026, 9, new Set())) {
      expect(semaine).toHaveLength(7);
    }
  });

  it("couvre tous les jours du mois une seule fois", () => {
    const jours = monthGrid(2026, 2, new Set())
      .flat()
      .filter((c) => c.day > 0)
      .map((c) => c.day);
    expect(jours).toHaveLength(28);
    expect(new Set(jours).size).toBe(28);
  });

  it("compte les années bissextiles", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("ne marque disponibles que les jours porteurs d’un créneau", () => {
    const grille = monthGrid(2026, 9, new Set(["2026-09-14"]));
    const ouverts = grille.flat().filter((c) => c.available);
    expect(ouverts.map((c) => c.day)).toEqual([14]);
  });
});

describe("navigation et libellés", () => {
  it("nomme le mois en français", () => {
    expect(monthLabel(2026, 9)).toBe("Septembre 2026");
  });

  it("ne propose que les mois qui portent un créneau", () => {
    const jours = groupSlotsByParisDay([
      creneau("2026-09-28T07:00:00.000Z"),
      creneau("2026-10-02T07:00:00.000Z"),
    ]);
    expect(bookingMonths(jours)).toEqual([
      { year: 2026, month: 9, label: "Septembre 2026" },
      { year: 2026, month: 10, label: "Octobre 2026" },
    ]);
  });

  it("dit le décalage horaire au visiteur", () => {
    expect(parisOffsetLabel(new Date("2026-09-14T07:00:00Z"), 120)).toBe("UTC+2");
    expect(parisOffsetLabel(new Date("2026-01-14T07:00:00Z"), 60)).toBe("UTC+1");
  });
});
