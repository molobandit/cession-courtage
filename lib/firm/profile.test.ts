import { describe, expect, it } from "vitest";
import { FIRM_PROFILE_SECTIONS, parseSectionForm, profileCompletion, profileFacts, readFirmProfile, sectionCompletion } from "@/lib/firm/profile";

const organisation = FIRM_PROFILE_SECTIONS.find((s) => s.key === "organisation")!;

describe("profil du cabinet", () => {
  it("calcule le pourcentage de chaque volet", () => {
    const p = readFirmProfile({ organisation: { effectif: "2 à 5", locaux: "Locataire", distribution: "Mixte" } });
    expect(sectionCompletion(p, organisation)).toBe(50);
    expect(profileCompletion(readFirmProfile({}))).toBe(0);
  });

  it("n’accepte que les options prévues", () => {
    const form = new FormData();
    form.set("effectif", "Mille");
    form.set("locaux", "Propriétaire");
    form.append("nimporte", "quoi");
    expect(parseSectionForm(organisation, form)).toEqual({ locaux: "Propriétaire" });
    expect(readFirmProfile({ organisation: { effectif: "Mille" } }).organisation).toEqual({});
  });

  it("donne des lignes lisibles pour la présentation", () => {
    const p = readFirmProfile({ positionnement: { reseaux: ["LinkedIn", "Facebook"] } });
    expect(profileFacts(p)).toEqual([{ section: "Activité", rows: [{ label: "Réseaux sociaux actifs", value: "LinkedIn, Facebook" }] }]);
  });
});
