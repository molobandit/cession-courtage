import type { DirectServices } from "@/lib/direct/fees";
import type { TransferCarrier } from "@/lib/direct/services";
import { stagesFor, stepByKey, type DirectStage } from "@/lib/direct/stages";

/**
 * Pièces du kit contractuel et attestations de transfert.
 *
 * Les pièces sont produites à partir de ce que le dossier sait déjà : les deux
 * cabinets, le prix, le comptant, le séquestre, les compagnies. Rien n'est
 * ressaisi, et c'est tout l'intérêt : une attestation dont le code courtier a
 * été retapé à la main est une attestation que la compagnie renvoie.
 *
 * Ce qui manque s'écrit « [à compléter] » plutôt que de disparaître : une
 * pièce muette sur un SIREN passe inaperçue jusqu'au refus de la compagnie,
 * une case visible se remplit avant l'envoi.
 *
 * Fonctions pures, testables sans base.
 */

export const MISSING = "[à compléter]";

export type DocumentParty = {
  legalName: string | null;
  legalForm: string | null;
  siren: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  oriasNumber: string | null;
  representative: string | null;
  jobTitle: string | null;
  email: string | null;
};

export type DocumentContext = {
  dealId: string;
  portfolioLabel: string;
  salePrice: number;
  upfrontPercent: number;
  escrow: boolean;
  seller: DocumentParty;
  buyer: DocumentParty;
  carriers: TransferCarrier[];
  effectiveDate: Date | null;
  deedSignedAt: Date | null;
  issuedAt: Date;
  /** Référence affichée ; à défaut, celle d'un dossier de gré à gré. */
  reference?: string;
  /** Conditions particulières de la lettre d'intention. */
  conditions?: string | null;
};

export type DocumentSection = { heading?: string; paragraphs: string[] };

export type GeneratedDocument = {
  key: string;
  title: string;
  subtitle: string;
  reference: string;
  addressee?: string[];
  sections: DocumentSection[];
  annex?: { heading: string; columns: string[]; rows: string[][] };
  signatories: { label: string; name: string; capacity: string }[];
  notice: string;
  signedAt: Date | null;
};

const NOTICE =
  "Pièce établie à partir des informations déclarées par les parties. Elle ne se substitue pas au conseil d’un avocat ; relisez-la avant de la signer.";

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateLongue = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

function fill(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : MISSING;
}

/** « 1er octobre 2026 » : le premier du mois s'écrit en ordinal dans un acte. */
export function formatLongDate(value: Date | null): string {
  if (!value) return MISSING;
  return dateLongue.format(value).replace(/^1 /, "1er ");
}

export function dealReference(dealId: string): string {
  return `GG-${dealId.slice(-8).toUpperCase()}`;
}

function referenceOf(ctx: DocumentContext): string {
  return ctx.reference ?? dealReference(ctx.dealId);
}

/** « Cabinet X, SAS, SIREN 123, 1 rue…, ORIAS n° 07… » — le cabinet seul. */
export function describeFirm(party: DocumentParty): string {
  const adresse = [party.address, [party.postalCode, party.city].filter(Boolean).join(" ")]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return [
    fill(party.legalName),
    fill(party.legalForm),
    `immatriculée sous le numéro SIREN ${fill(party.siren)}`,
    `dont le siège est situé ${adresse || MISSING}`,
    `inscrite à l’ORIAS sous le numéro ${fill(party.oriasNumber)}`,
  ].join(", ");
}

/** Le cabinet et la personne qui l'engage. */
export function describeParty(party: DocumentParty): string {
  const qualite = party.jobTitle?.trim() ? `, ${party.jobTitle.trim()}` : "";
  return `${describeFirm(party)}, représentée par ${fill(party.representative)}${qualite}`;
}

/** Champs d'identification absents, pour prévenir avant l'impression. */
export function missingPartyFields(party: DocumentParty): string[] {
  const champs: [keyof DocumentParty, string][] = [
    ["legalName", "raison sociale"],
    ["legalForm", "forme juridique"],
    ["siren", "SIREN"],
    ["address", "adresse"],
    ["oriasNumber", "numéro ORIAS"],
    ["representative", "représentant légal"],
  ];
  return champs.filter(([cle]) => !party[cle]?.trim()).map(([, libelle]) => libelle);
}

function signatories(ctx: DocumentContext) {
  return [
    {
      label: "Le cédant",
      name: fill(ctx.seller.legalName),
      capacity: `Représentée par ${fill(ctx.seller.representative)}`,
    },
    {
      label: "Le cessionnaire",
      name: fill(ctx.buyer.legalName),
      capacity: `Représentée par ${fill(ctx.buyer.representative)}`,
    },
  ];
}

function carrierAnnex(ctx: DocumentContext) {
  return {
    heading: "Annexe — Compagnies et codes concernés",
    columns: ["Compagnie", "Code courtier du cédant"],
    rows:
      ctx.carriers.length > 0
        ? ctx.carriers.map((c) => [c.name, c.code || MISSING])
        : [[MISSING, MISSING]],
  };
}

// ---------------------------------------------------------------------------
// Accord de confidentialité
// ---------------------------------------------------------------------------

export function buildConfidentialityAgreement(ctx: DocumentContext): GeneratedDocument {
  return {
    key: "confidentialite",
    title: "Accord de confidentialité",
    subtitle: "Engagement réciproque préalable à la cession d’un portefeuille de courtage",
    reference: referenceOf(ctx),
    sections: [
      {
        heading: "Entre les soussignés",
        paragraphs: [
          `${describeParty(ctx.seller)}, ci-après « le cédant » ;`,
          `${describeParty(ctx.buyer)}, ci-après « le cessionnaire ».`,
        ],
      },
      {
        heading: "Article 1 — Objet",
        paragraphs: [
          `Les parties étudient la cession du portefeuille suivant : ${ctx.portfolioLabel}. Le présent accord encadre l’usage des informations échangées à cette fin.`,
        ],
      },
      {
        heading: "Article 2 — Informations confidentielles",
        paragraphs: [
          "Sont confidentielles toutes les informations transmises par une partie à l’autre, quel qu’en soit le support : bordereaux de commissions, conditions conclues avec les compagnies, données financières, organisation du cabinet et, plus généralement, toute information relative au portefeuille.",
          "Ne sont pas confidentielles les informations déjà publiques, ou que la partie qui les reçoit détenait légitimement avant leur communication.",
        ],
      },
      {
        heading: "Article 3 — Engagements",
        paragraphs: [
          "Chaque partie s’engage à n’utiliser ces informations que pour évaluer et réaliser la cession, à ne les communiquer qu’à ses conseils et collaborateurs tenus au secret, et à ne démarcher aucun client du portefeuille sur leur fondement.",
          "Aucune donnée nominative de client final n’est transmise avant la signature du protocole de cession. Au-delà, ces données sont traitées conformément au règlement (UE) 2016/679.",
        ],
      },
      {
        heading: "Article 4 — Durée",
        paragraphs: [
          "Le présent accord prend effet à sa signature. Il demeure en vigueur trois ans, que la cession se réalise ou non. En l’absence de cession, chaque partie restitue ou détruit les informations reçues dans les quinze jours suivant la demande de l’autre.",
        ],
      },
      {
        heading: "Article 5 — Droit applicable",
        paragraphs: [
          "Le présent accord est soumis au droit français. Tout différend relève des juridictions compétentes du ressort du siège du cédant.",
        ],
      },
    ],
    signatories: signatories(ctx),
    notice: NOTICE,
    signedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Lettre d'intention
// ---------------------------------------------------------------------------

export function buildLetterOfIntent(ctx: DocumentContext): GeneratedDocument {
  const comptant = Math.round(ctx.salePrice * (ctx.upfrontPercent / 100) * 100) / 100;
  const solde = Math.round((ctx.salePrice - comptant) * 100) / 100;
  const sections: DocumentSection[] = [
    {
      heading: "Entre les soussignés",
      paragraphs: [
        `${describeParty(ctx.buyer)}, ci-après « l’acquéreur » ;`,
        `${describeParty(ctx.seller)}, ci-après « le cédant ».`,
      ],
    },
    {
      heading: "Article 1 — Objet",
      paragraphs: [
        `Après examen des pièces mises à sa disposition, l’acquéreur fait part de son intention d’acquérir le portefeuille suivant : ${ctx.portfolioLabel}.`,
      ],
    },
    {
      heading: "Article 2 — Prix",
      paragraphs: [
        `Le prix proposé est de ${euro.format(ctx.salePrice)}, net vendeur.`,
        solde > 0
          ? `${euro.format(comptant)} (${ctx.upfrontPercent.toLocaleString("fr-FR")} %) sont versés sur un compte séquestre à la signature du protocole. Le solde de ${euro.format(solde)} est libéré après la vérification de conservation à douze mois : il est ajusté au taux de conservation constaté rapporté à l’objectif de 90 %, dans la limite de 50 % à 100 % du solde.`
          : "Il est payable en totalité comptant, par l’intermédiaire du compte séquestre.",
      ],
    },
    {
      heading: "Article 3 — Date d’effet envisagée",
      paragraphs: [`Les parties envisagent un transfert des contrats au ${formatLongDate(ctx.effectiveDate)}.`],
    },
    {
      heading: "Article 4 — Conditions",
      paragraphs: [
        "La présente intention est subordonnée à la vérification de l’identité et de l’immatriculation des deux cabinets, à la signature d’un protocole de cession, et, lorsque la compagnie l’exige, à son accord sur le transfert des contrats.",
        ...(ctx.conditions?.trim() ? [`Conditions particulières : ${ctx.conditions.trim()}`] : []),
      ],
    },
    {
      heading: "Article 5 — Exclusivité et portée",
      paragraphs: [
        "À compter de son acceptation, le cédant s’interdit de négocier la cession du portefeuille avec un tiers pendant soixante jours.",
        "La présente lettre ne vaut pas cession. Seules les stipulations relatives à l’exclusivité et à la confidentialité engagent les parties dès son acceptation.",
      ],
    },
  ];
  return {
    key: "lettre-intention",
    title: "Lettre d’intention",
    subtitle: "Acquisition d’un portefeuille de contrats d’assurance",
    reference: referenceOf(ctx),
    sections,
    signatories: [
      { label: "L’acquéreur", name: fill(ctx.buyer.legalName), capacity: `Représentée par ${fill(ctx.buyer.representative)}` },
      { label: "Le cédant", name: fill(ctx.seller.legalName), capacity: `Représentée par ${fill(ctx.seller.representative)}` },
    ],
    notice: NOTICE,
    signedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Protocole de cession
// ---------------------------------------------------------------------------

export function buildTransferDeed(ctx: DocumentContext): GeneratedDocument {
  const comptant = Math.round(ctx.salePrice * (ctx.upfrontPercent / 100) * 100) / 100;
  const solde = Math.round((ctx.salePrice - comptant) * 100) / 100;

  const paiement = [
    `Le prix de cession est fixé à ${euro.format(ctx.salePrice)}, net vendeur, hors frais et honoraires.`,
    solde > 0
      ? `Il est payable à hauteur de ${euro.format(comptant)} (${ctx.upfrontPercent.toLocaleString("fr-FR")} %) comptant, le solde de ${euro.format(solde)} étant réglé selon l’échéancier convenu entre les parties et annexé aux présentes.`
      : "Il est payable en totalité comptant.",
  ];
  if (ctx.escrow) {
    paiement.push(
      `La part comptant est versée sur un compte séquestre ouvert au nom des parties. Elle est libérée au profit du cédant une fois les attestations de transfert émises et la cession constatée.`,
    );
  }

  return {
    key: "protocole",
    title: "Protocole de cession de portefeuille",
    subtitle: "Cession d’un portefeuille de contrats d’assurance entre intermédiaires",
    reference: referenceOf(ctx),
    sections: [
      {
        heading: "Entre les soussignés",
        paragraphs: [
          `${describeParty(ctx.seller)}, ci-après « le cédant » ;`,
          `${describeParty(ctx.buyer)}, ci-après « le cessionnaire ».`,
        ],
      },
      {
        heading: "Article 1 — Objet",
        paragraphs: [
          `Le cédant cède au cessionnaire, qui l’accepte, le portefeuille désigné comme suit : ${ctx.portfolioLabel}.`,
          "La cession porte sur les contrats en cours souscrits par l’intermédiaire du cédant auprès des compagnies listées en annexe, ainsi que sur le droit aux commissions afférentes à compter de la date d’effet.",
        ],
      },
      { heading: "Article 2 — Prix et modalités de paiement", paragraphs: paiement },
      {
        heading: "Article 3 — Transfert",
        paragraphs: [
          `La cession prend effet le ${formatLongDate(ctx.effectiveDate)}.`,
          "Le cédant signe, pour chaque compagnie, une attestation demandant le rattachement des contrats et des commissions au code du cessionnaire. Les commissions échues avant la date d’effet restent acquises au cédant.",
        ],
      },
      {
        heading: "Article 4 — Déclarations du cédant",
        paragraphs: [
          "Le cédant déclare être régulièrement immatriculé à l’ORIAS, que les contrats cédés ont été souscrits dans le respect des règles de distribution applicables, et qu’il n’existe à sa connaissance aucune réclamation ou procédure de nature à affecter le portefeuille qui n’ait été portée à la connaissance du cessionnaire.",
        ],
      },
      {
        heading: "Article 5 — Engagements du cessionnaire",
        paragraphs: [
          "Le cessionnaire déclare être immatriculé à l’ORIAS dans une catégorie lui permettant de distribuer les contrats cédés. Il reprend, à compter de la date d’effet, le suivi des clients et le devoir de conseil qui s’y attache.",
        ],
      },
      {
        heading: "Article 6 — Information des clients",
        paragraphs: [
          "Les parties informent conjointement les clients du changement d’intermédiaire dans le mois suivant la date d’effet, dans le respect du règlement (UE) 2016/679.",
        ],
      },
      {
        heading: "Article 7 — Non-sollicitation",
        paragraphs: [
          "Pendant trois ans à compter de la date d’effet, le cédant s’interdit de solliciter, directement ou par personne interposée, les clients du portefeuille cédé.",
        ],
      },
      {
        heading: "Article 8 — Conditions suspensives",
        paragraphs: [
          "La cession est subordonnée, lorsque la compagnie l’exige, à son accord sur le transfert des contrats au code du cessionnaire. À défaut d’accord d’une compagnie dans les soixante jours, le prix est réduit à proportion des commissions annuelles concernées.",
        ],
      },
      {
        heading: "Article 9 — Droit applicable",
        paragraphs: [
          "Le présent protocole est soumis au droit français. Tout différend relève des juridictions compétentes du ressort du siège du cédant.",
        ],
      },
    ],
    annex: carrierAnnex(ctx),
    signatories: signatories(ctx),
    notice: NOTICE,
    signedAt: ctx.deedSignedAt,
  };
}

// ---------------------------------------------------------------------------
// Attestations de transfert
// ---------------------------------------------------------------------------

export function certificateKey(index: number): string {
  return `attestation-${index + 1}`;
}

export function buildTransferCertificate(
  ctx: DocumentContext,
  carrierIndex: number,
): GeneratedDocument | null {
  const carrier = ctx.carriers[carrierIndex];
  if (!carrier) return null;
  const vendeur = ctx.seller;
  const acheteur = ctx.buyer;

  return {
    key: certificateKey(carrierIndex),
    title: "Attestation de transfert de portefeuille",
    subtitle: `Compagnie : ${carrier.name}`,
    reference: `${referenceOf(ctx)}-${carrierIndex + 1}`,
    addressee: [carrier.name, "À l’attention du service partenaires / courtage"],
    sections: [
      {
        paragraphs: [
          `Je soussigné(e) ${fill(vendeur.representative)}, agissant en qualité de ${vendeur.jobTitle?.trim() || "représentant légal"} de ${describeFirm(vendeur)}, titulaire du code courtier ${fill(carrier.code)} auprès de ${carrier.name},`,
          `atteste avoir cédé à ${describeFirm(acheteur)} le portefeuille des contrats souscrits par mon intermédiaire auprès de votre compagnie.`,
          `En conséquence, je vous demande de rattacher l’ensemble des contrats en cours enregistrés sous le code ${fill(carrier.code)}, ainsi que les commissions afférentes, au code du cessionnaire à compter du ${formatLongDate(ctx.effectiveDate)}.`,
          "Les commissions échues avant cette date restent dues au cédant.",
        ],
      },
      {
        heading: "Acceptation du cessionnaire",
        paragraphs: [
          `${fill(acheteur.legalName)} accepte ce transfert et reprend, à compter de la même date, la gestion des contrats et le devoir de conseil envers les clients concernés.`,
        ],
      },
    ],
    signatories: signatories(ctx),
    notice: "Pièce à signer par les deux parties, puis à adresser à la compagnie avec les extraits Kbis et les attestations ORIAS.",
    signedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Disponibilité
// ---------------------------------------------------------------------------

export type DocumentAvailability = {
  key: string;
  title: string;
  availableFrom: DirectStage;
  available: boolean;
  hint: string;
};

function reached(stage: DirectStage, target: DirectStage, services: DirectServices): boolean {
  const ordre = stagesFor(services);
  const courant = ordre.indexOf(stage);
  const cible = ordre.indexOf(target);
  return cible >= 0 && courant >= cible;
}

/**
 * Pièces du dossier, et à partir de quand elles s'ouvrent.
 *
 * Une pièce n'est pas produite avant l'étape qui la justifie : un protocole
 * avant la vérification des parties nommerait des cabinets que personne n'a
 * vérifiés, une attestation avant la signature attesterait une cession qui
 * n'est pas conclue.
 */
export function documentsFor(input: {
  stage: DirectStage;
  services: DirectServices;
  carriers: TransferCarrier[];
}): DocumentAvailability[] {
  const { stage, services, carriers } = input;
  const pieces: DocumentAvailability[] = [];

  const entree = (key: string, title: string, from: DirectStage): DocumentAvailability => {
    const ok = reached(stage, from, services);
    return {
      key,
      title,
      availableFrom: from,
      available: ok,
      hint: ok ? "Prête à imprimer" : `Disponible à l’étape « ${stepByKey(from).label} »`,
    };
  };

  if (services.kit) {
    pieces.push(entree("confidentialite", "Accord de confidentialité", "ACCEPTED"));
    pieces.push(entree("protocole", "Protocole de cession", "DEED"));
  }
  if (services.kit || services.attestations) {
    if (carriers.length === 0) {
      pieces.push({
        key: "attestations",
        title: "Attestations de transfert",
        availableFrom: "TRANSFER",
        available: false,
        hint: "Renseignez les compagnies concernées",
      });
    } else {
      carriers.forEach((carrier, index) => {
        pieces.push(entree(certificateKey(index), `Attestation — ${carrier.name}`, "TRANSFER"));
      });
    }
  }
  return pieces;
}

/** Construit la pièce demandée, ou `null` si elle n'existe pas pour ce dossier. */
export function buildDocument(key: string, ctx: DocumentContext): GeneratedDocument | null {
  if (key === "confidentialite") return buildConfidentialityAgreement(ctx);
  if (key === "protocole") return buildTransferDeed(ctx);
  const match = /^attestation-(\d+)$/.exec(key);
  if (match) return buildTransferCertificate(ctx, Number(match[1]) - 1);
  return null;
}
