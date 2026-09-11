import { describe, expect, it } from "vitest";
import { CERTIFICATION_SLOTS } from "@/lib/listing/certification-slots";
import {
  resteAFaire,
  statutAChanger,
  statutCertification,
  toutesObligatoiresValidees,
  type PieceCertification,
} from "@/lib/listing/certification-decision";

const OBLIGATOIRES = CERTIFICATION_SLOTS.filter((s) => s.required);
const FACULTATIVES = CERTIFICATION_SLOTS.filter((s) => !s.required);

type Slot = { category: string; label: string; required: boolean };

function pieces(statut: string, slots: readonly Slot[] = CERTIFICATION_SLOTS): PieceCertification[] {
  return slots.map((s) => ({ category: s.category, label: s.label, status: statut }));
}

describe("décision de certification", () => {
  it("reste NONE tant que rien n’est demandé", () => {
    expect(statutCertification(pieces("VALIDATED"), false)).toBe("NONE");
  });

  it("passe en instruction dès la demande, sans pièce", () => {
    expect(statutCertification([], true)).toBe("PENDING");
  });

  it("certifie quand toutes les pièces obligatoires sont validées", () => {
    const validees = pieces("VALIDATED", OBLIGATOIRES);
    expect(statutCertification(validees, true)).toBe("CERTIFIED");
  });

  it("ne certifie pas sur des pièces seulement reçues", () => {
    // Une piece recue mais non controlee ne vaut rien : certifier la, ce serait
    // certifier l'existence d'un envoi, pas le contenu d'un portefeuille.
    expect(statutCertification(pieces("RECEIVED", OBLIGATOIRES), true)).toBe("PENDING");
  });

  it("n’exige pas les pièces facultatives", () => {
    const melange = [...pieces("VALIDATED", OBLIGATOIRES), ...pieces("MISSING", FACULTATIVES)];
    expect(statutCertification(melange, true)).toBe("CERTIFIED");
  });

  it("refuse dès qu’une pièce obligatoire est refusée", () => {
    const une = [...pieces("VALIDATED", OBLIGATOIRES)];
    une[0] = { ...une[0], status: "REJECTED" };
    expect(statutCertification(une, true)).toBe("REJECTED");
  });

  it("ignore le refus d’une pièce facultative", () => {
    const melange = [...pieces("VALIDATED", OBLIGATOIRES), ...pieces("REJECTED", FACULTATIVES)];
    expect(statutCertification(melange, true)).toBe("CERTIFIED");
  });

  it("ne certifie pas s’il manque une seule obligatoire", () => {
    const presque = pieces("VALIDATED", OBLIGATOIRES).slice(1);
    expect(toutesObligatoiresValidees(presque)).toBe(false);
    expect(statutCertification(presque, true)).toBe("PENDING");
  });
});

describe("écriture en base", () => {
  it("n’écrit rien quand le statut ne bouge pas", () => {
    // D1 n'aime pas les mises a jour gratuites, et une ligne reecrite sans
    // changement brouille l'horodatage.
    expect(statutAChanger("PENDING", "PENDING")).toBeNull();
    expect(statutAChanger("CERTIFIED", "CERTIFIED")).toBeNull();
  });

  it("signale le changement quand il a lieu", () => {
    expect(statutAChanger("PENDING", "CERTIFIED")).toBe("CERTIFIED");
    expect(statutAChanger("CERTIFIED", "REJECTED")).toBe("REJECTED");
  });
});

describe("ce qui reste à faire, montré au cédant", () => {
  it("ne liste que les pièces obligatoires", () => {
    const reste = resteAFaire([]);
    expect(reste).toHaveLength(OBLIGATOIRES.length);
  });

  it("dit dans quel état se trouve chaque manque", () => {
    const melange: PieceCertification[] = [
      { ...OBLIGATOIRES[0], status: "RECEIVED" },
      { ...OBLIGATOIRES[1], status: "REJECTED" },
    ];
    const reste = resteAFaire(melange);
    expect(reste.some((l) => l.includes("contrôle en cours"))).toBe(true);
    expect(reste.some((l) => l.includes("à remplacer"))).toBe(true);
    expect(reste.some((l) => l.includes("à déposer"))).toBe(true);
  });

  it("ne reste rien à faire une fois tout validé", () => {
    expect(resteAFaire(pieces("VALIDATED", OBLIGATOIRES))).toHaveLength(0);
  });
});
