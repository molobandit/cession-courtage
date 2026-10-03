/**
 * Profil du cabinet, en quatre volets : positionnement, organisation,
 * conformité, stratégie.
 *
 * Rempli une fois dans le profil, il sert partout : présentation PDF remise aux
 * acquéreurs engagés, relecture des annonces, correspondances entre cédants et
 * acquéreurs. Chaque volet affiche son pourcentage de complétude, pour que le
 * courtier sache ce qui manque d'un coup d'œil.
 *
 * Fonctions pures, testables sans base.
 */

export type FieldType = "one" | "many" | "text";

export type ProfileField = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  hint?: string;
};

export type ProfileSection = {
  key: "positionnement" | "organisation" | "conformite" | "strategie";
  title: string;
  lede: string;
  fields: ProfileField[];
};

export const FIRM_PROFILE_SECTIONS: ProfileSection[] = [
  {
    key: "positionnement",
    title: "Activité",
    lede: "Votre démarche commerciale au quotidien.",
    fields: [
      { key: "risques", label: "Branches travaillées", type: "many", options: ["Vie et épargne", "Santé et prévoyance", "Emprunteur", "IARD particuliers", "IARD professionnels et entreprises"] },
      { key: "groupement", label: "Groupement, réseau ou franchise", type: "text", hint: "Nom du réseau, ou « Aucun »" },
      { key: "prospects", label: "Origine des clients", type: "many", options: ["Recommandation", "Prospection directe", "Leads achetés", "Comparateurs", "Partenariats", "Site internet"] },
      { key: "suiviClient", label: "Suivi des clients", type: "one", options: ["Logiciel métier", "CRM", "Tableur", "Dossiers papier"] },
      { key: "digital", label: "Présence en ligne", type: "many", options: ["Site vitrine", "Site générateur de contacts", "Souscription en ligne", "Référencement payant", "Aucune"] },
      { key: "reseaux", label: "Réseaux sociaux actifs", type: "many", options: ["LinkedIn", "Facebook", "Instagram", "X", "TikTok", "Aucun"] },
    ],
  },
  {
    key: "organisation",
    title: "Équipe",
    lede: "L’équipe, les locaux et les outils qui font tourner le cabinet.",
    fields: [
      { key: "effectif", label: "Effectif", type: "one", options: ["Seul", "2 à 5", "6 à 20", "Plus de 20"] },
      { key: "locaux", label: "Locaux", type: "one", options: ["Propriétaire", "Locataire", "Domiciliation", "Sans locaux"] },
      { key: "distribution", label: "Mode de vente", type: "one", options: ["Agence ou bureau", "Vente à distance", "Mixte"] },
      { key: "logiciels", label: "Logiciels métier", type: "text", hint: "Ex. : Oggo, Assurmax, Excel" },
      { key: "apporteurs", label: "Apporteurs d’affaires", type: "one", options: ["Aucun", "1 à 5", "Plus de 5"] },
      { key: "dependance", label: "Dépendance au dirigeant", type: "one", options: ["Faible, équipe autonome", "Moyenne", "Forte"] },
    ],
  },
  {
    key: "conformite",
    title: "Obligations",
    lede: "Ce qu’un acquéreur vérifie avant de s’engager.",
    fields: [
      { key: "orias", label: "Catégories ORIAS", type: "many", options: ["COA", "MIA", "AGA", "MA", "IOBSP"] },
      { key: "rcPro", label: "Assureur RC professionnelle", type: "text" },
      { key: "garantie", label: "Garantie financière", type: "one", options: ["Oui", "Non, pas d’encaissement de fonds"] },
      { key: "dda", label: "Formation DDA", type: "one", options: ["À jour", "Rattrapage en cours", "À régulariser"] },
      { key: "lcbft", label: "Dispositif anti-blanchiment", type: "one", options: ["Formalisé", "Mise à jour en cours", "À formaliser"] },
      { key: "demarchage", label: "Démarchage téléphonique", type: "one", options: ["Aucun démarchage", "Conforme Bloctel", "À régulariser"] },
      { key: "rgpd", label: "Registre RGPD", type: "one", options: ["Tenu à jour", "En cours", "À mettre en place"] },
    ],
  },
  {
    key: "strategie",
    title: "Projet",
    lede: "Où va le cabinet, et à quel rythme.",
    fields: [
      { key: "projet", label: "Projet", type: "many", options: ["Céder tout le portefeuille", "Céder une partie", "Acquérir", "Croître par rachats", "Transmettre à un proche"] },
      { key: "horizon", label: "Horizon", type: "one", options: ["Moins de 6 mois", "6 à 12 mois", "Plus d’un an"] },
      { key: "motif", label: "Motif principal", type: "one", options: ["Retraite", "Recentrage d’activité", "Développement", "Autre"] },
      { key: "zones", label: "Zones visées ou couvertes", type: "text", hint: "Départements ou régions" },
      { key: "accompagnement", label: "Accompagnement proposé au repreneur", type: "one", options: ["Aucun", "Jusqu’à 3 mois", "3 à 6 mois", "Plus de 6 mois"] },
    ],
  },
];

export type FirmProfile = Record<string, Record<string, string | string[]>>;

export function readFirmProfile(value: unknown): FirmProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: FirmProfile = {};
  for (const section of FIRM_PROFILE_SECTIONS) {
    const brut = (value as Record<string, unknown>)[section.key];
    if (!brut || typeof brut !== "object") continue;
    const champs: Record<string, string | string[]> = {};
    for (const f of section.fields) {
      const v = (brut as Record<string, unknown>)[f.key];
      if (f.type === "many" && Array.isArray(v)) champs[f.key] = v.filter((x): x is string => typeof x === "string" && (f.options ?? []).includes(x));
      else if (f.type === "one" && typeof v === "string" && (f.options ?? []).includes(v)) champs[f.key] = v;
      else if (f.type === "text" && typeof v === "string") champs[f.key] = v.trim().slice(0, 200);
    }
    out[section.key] = champs;
  }
  return out;
}

function rempli(v: string | string[] | undefined): boolean {
  return Array.isArray(v) ? v.length > 0 : Boolean(v && v.trim());
}

/** Pourcentage de complétude d'un volet, arrondi. */
export function sectionCompletion(profile: FirmProfile, section: ProfileSection): number {
  const valeurs = profile[section.key] ?? {};
  const faits = section.fields.filter((f) => rempli(valeurs[f.key])).length;
  return Math.round((faits / section.fields.length) * 100);
}

export function profileCompletion(profile: FirmProfile): number {
  const total = FIRM_PROFILE_SECTIONS.reduce((n, s) => n + s.fields.length, 0);
  const faits = FIRM_PROFILE_SECTIONS.reduce(
    (n, s) => n + s.fields.filter((f) => rempli((profile[s.key] ?? {})[f.key])).length,
    0,
  );
  return Math.round((faits / total) * 100);
}

/** Lecture d'un formulaire de volet : n'accepte que les options prévues. */
export function parseSectionForm(section: ProfileSection, form: FormData): Record<string, string | string[]> {
  const champs: Record<string, string | string[]> = {};
  for (const f of section.fields) {
    if (f.type === "many") {
      const choix = form.getAll(f.key).map(String).filter((x) => (f.options ?? []).includes(x));
      if (choix.length) champs[f.key] = choix;
    } else if (f.type === "one") {
      const v = String(form.get(f.key) ?? "");
      if ((f.options ?? []).includes(v)) champs[f.key] = v;
    } else {
      const v = String(form.get(f.key) ?? "").trim().slice(0, 200);
      if (v) champs[f.key] = v;
    }
  }
  return champs;
}

/** Lignes lisibles du profil, pour la présentation PDF. */
export function profileFacts(profile: FirmProfile): { section: string; rows: { label: string; value: string }[] }[] {
  return FIRM_PROFILE_SECTIONS.map((s) => ({
    section: s.title,
    rows: s.fields
      .map((f) => {
        const v = (profile[s.key] ?? {})[f.key];
        return { label: f.label, value: Array.isArray(v) ? v.join(", ") : (v ?? "") };
      })
      .filter((r) => r.value),
  })).filter((s) => s.rows.length > 0);
}
