/**
 * Pièces du cabinet, en démonstration.
 *
 * Les annonces du catalogue appartiennent toutes au même cabinet : elles
 * portent donc les mêmes quatre pièces, écrites une fois et rangées sous une
 * seule clé par pièce. Un acquéreur positionné sur n'importe quel dossier du
 * catalogue trouve une salle de données complète, et le lien de chaque pièce
 * ouvre un vrai PDF.
 *
 * Contenu fictif, aucune donnée nominative de client final : un cabinet, des
 * compagnies, des montants arrondis.
 *
 *   npx tsx scripts/write-demo-company-docs.ts <dossier de sortie>
 *
 * Écrit les quatre PDF dans le dossier donné, et le SQL des lignes dans
 * scripts/d1-demo-company-docs.sql.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { CATALOG_COUNT, CATALOG_SELLER, CATALOG_FIRM } from "../lib/listing/catalog-listings";

const A4 = { w: 595.28, h: 841.89 };
const MARGE = 48;
const LARGEUR = A4.w - MARGE * 2;

const BLEU = rgb(0.145, 0.388, 0.922);
const ENCRE = rgb(0.067, 0.094, 0.153);
const GRIS = rgb(0.373, 0.42, 0.478);
const TRAIT = rgb(0.898, 0.906, 0.922);
const BLEU_PALE = rgb(0.937, 0.965, 1);
const BLANC = rgb(1, 1, 1);

/** Les polices standard du PDF ignorent nos accents composés : on les ramène. */
function lisible(texte: string): string {
  return texte
    .replace(/[   ]/g, " ")
    .replace(/[‐-‒]/g, "-")
    .replace(/…/g, "...")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Le point médian n'est pas dans le jeu des polices standard.
    .replace(/·/g, "-");
}

type Ctx = { page: PDFPage; y: number; regular: PDFFont; bold: PDFFont };

function titre(ctx: Ctx, texte: string) {
  ctx.page.drawText(lisible(texte), { x: MARGE, y: ctx.y, size: 17, font: ctx.bold, color: ENCRE });
  ctx.y -= 26;
}

function sousTitre(ctx: Ctx, texte: string) {
  ctx.page.drawText(lisible(texte), { x: MARGE, y: ctx.y, size: 11, font: ctx.bold, color: BLEU });
  ctx.y -= 18;
}

function paragraphe(ctx: Ctx, texte: string, taille = 10) {
  const mots = lisible(texte).split(" ");
  let ligne = "";
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ctx.regular.widthOfTextAtSize(essai, taille) > LARGEUR) {
      ctx.page.drawText(ligne, { x: MARGE, y: ctx.y, size: taille, font: ctx.regular, color: ENCRE });
      ctx.y -= taille + 5;
      ligne = mot;
    } else {
      ligne = essai;
    }
  }
  if (ligne) {
    ctx.page.drawText(ligne, { x: MARGE, y: ctx.y, size: taille, font: ctx.regular, color: ENCRE });
    ctx.y -= taille + 5;
  }
  ctx.y -= 6;
}

function tableau(ctx: Ctx, entetes: string[], lignes: string[][]) {
  const colonnes = entetes.length;
  const largeur = LARGEUR / colonnes;
  ctx.page.drawRectangle({ x: MARGE, y: ctx.y - 4, width: LARGEUR, height: 20, color: BLEU_PALE });
  entetes.forEach((t, i) => {
    ctx.page.drawText(lisible(t), { x: MARGE + 6 + i * largeur, y: ctx.y + 2, size: 9, font: ctx.bold, color: BLEU });
  });
  ctx.y -= 22;
  for (const ligne of lignes) {
    ligne.forEach((t, i) => {
      ctx.page.drawText(lisible(t), { x: MARGE + 6 + i * largeur, y: ctx.y, size: 9.5, font: ctx.regular, color: ENCRE });
    });
    ctx.y -= 7;
    ctx.page.drawLine({
      start: { x: MARGE, y: ctx.y },
      end: { x: MARGE + LARGEUR, y: ctx.y },
      thickness: 0.5,
      color: TRAIT,
    });
    ctx.y -= 11;
  }
  ctx.y -= 8;
}

async function document(titreDoc: string, remplir: (ctx: Ctx) => void): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(lisible(`${titreDoc} - ${CATALOG_FIRM.legalName}`));
  doc.setProducer("La bourse du portefeuille");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4.w, A4.h]);

  // Bandeau : le cabinet, et la mention de démonstration, lisible d'un coup d'oeil.
  page.drawRectangle({ x: 0, y: A4.h - 92, width: A4.w, height: 92, color: BLEU });
  page.drawText(lisible(CATALOG_FIRM.legalName), {
    x: MARGE,
    y: A4.h - 48,
    size: 15,
    font: bold,
    color: BLANC,
  });
  page.drawText(
    lisible(`${CATALOG_FIRM.legalForm} au capital de 50 000 € · SIREN ${CATALOG_FIRM.siren} · ORIAS ${CATALOG_SELLER.oriasNumber}`),
    { x: MARGE, y: A4.h - 66, size: 8.5, font: regular, color: BLANC },
  );
  page.drawText("DOCUMENT DE DÉMONSTRATION", {
    x: MARGE,
    y: A4.h - 82,
    size: 8,
    font: bold,
    color: BLANC,
  });

  const ctx: Ctx = { page, y: A4.h - 130, regular, bold };
  titre(ctx, titreDoc);
  remplir(ctx);

  page.drawText(
    lisible(
      `${CATALOG_FIRM.address}, ${CATALOG_FIRM.postalCode} ${CATALOG_FIRM.city} · pièce de démonstration de La bourse du portefeuille, sans valeur juridique.`,
    ),
    { x: MARGE, y: 36, size: 7.5, font: regular, color: GRIS },
  );
  return doc.save();
}

const PIECES = {
  STATUTS: {
    fileName: "statuts.pdf",
    titre: "Statuts de la société",
    remplir(ctx: Ctx) {
      sousTitre(ctx, "Article 1 · Forme");
      paragraphe(
        ctx,
        `La société est une société par actions simplifiée régie par les dispositions du code de commerce. Elle est immatriculée au registre du commerce et des sociétés de Paris sous le numéro ${CATALOG_FIRM.siren}.`,
      );
      sousTitre(ctx, "Article 2 · Objet");
      paragraphe(
        ctx,
        "La société a pour objet le courtage d'assurances et de réassurances, l'intermédiation en opérations de banque et en services de paiement, ainsi que le conseil en gestion de patrimoine. Elle est immatriculée à l'ORIAS en qualité de courtier d'assurance ou de réassurance.",
      );
      sousTitre(ctx, "Article 3 · Dénomination et siège");
      paragraphe(
        ctx,
        `La dénomination sociale est ${CATALOG_FIRM.legalName}. Le siège social est fixé ${CATALOG_FIRM.address}, ${CATALOG_FIRM.postalCode} ${CATALOG_FIRM.city}.`,
      );
      sousTitre(ctx, "Article 4 · Capital social");
      paragraphe(
        ctx,
        "Le capital social est fixé à cinquante mille euros, divisé en cinq mille actions de dix euros chacune, intégralement libérées et réparties entre les associés.",
      );
      sousTitre(ctx, "Article 5 · Direction");
      paragraphe(
        ctx,
        `La société est dirigée par un président, ${CATALOG_SELLER.fullName}, nommé sans limitation de durée. Il représente la société à l'égard des tiers et dispose des pouvoirs les plus étendus dans la limite de l'objet social.`,
      );
      sousTitre(ctx, "Article 6 · Exercice social");
      paragraphe(ctx, "L'exercice social commence le 1er janvier et se termine le 31 décembre de chaque année.");
    },
  },
  LIASSES: {
    fileName: "liasses-fiscales.pdf",
    titre: "Liasses fiscales des trois derniers exercices",
    remplir(ctx: Ctx) {
      paragraphe(
        ctx,
        "Synthèse des comptes annuels déposés, en euros. Les liasses complètes, avec annexes, sont remises à l'acquéreur lors de la signature.",
      );
      sousTitre(ctx, "Compte de résultat");
      tableau(
        ctx,
        ["Poste", "2023", "2024", "2025"],
        [
          ["Chiffre d'affaires", "198 400", "214 700", "231 500"],
          ["Dont commissions", "191 200", "206 900", "223 800"],
          ["Charges externes", "52 300", "55 100", "57 400"],
          ["Charges de personnel", "88 600", "93 200", "97 800"],
          ["Résultat d'exploitation", "41 900", "49 300", "58 200"],
          ["Résultat net", "29 700", "35 100", "42 400"],
        ],
      );
      sousTitre(ctx, "Bilan");
      tableau(
        ctx,
        ["Poste", "2023", "2024", "2025"],
        [
          ["Immobilisations", "18 200", "16 900", "15 700"],
          ["Créances clients", "31 400", "34 800", "36 200"],
          ["Trésorerie", "74 600", "92 100", "118 300"],
          ["Capitaux propres", "96 800", "118 400", "148 100"],
          ["Dettes fournisseurs", "12 700", "13 500", "14 100"],
        ],
      );
      paragraphe(
        ctx,
        "Aucun litige provisionné. Aucun engagement hors bilan. Comptes établis selon le plan comptable général et déposés dans les délais légaux.",
        9,
      );
    },
  },
  COMMISSIONS: {
    fileName: "bordereaux-commissions.pdf",
    titre: "Bordereaux de commissions des douze derniers mois",
    remplir(ctx: Ctx) {
      paragraphe(
        ctx,
        "Commissions nettes encaissées, par compagnie et par mois, en euros. Aucun nom d'assuré ne figure sur ce document : le grain le plus fin est la compagnie.",
      );
      tableau(
        ctx,
        ["Mois", "AXA", "Generali", "April", "Total"],
        [
          ["Octobre 2025", "612", "348", "276", "1 236"],
          ["Novembre 2025", "598", "341", "281", "1 220"],
          ["Décembre 2025", "631", "352", "268", "1 251"],
          ["Janvier 2026", "624", "359", "289", "1 272"],
          ["Février 2026", "607", "344", "274", "1 225"],
          ["Mars 2026", "619", "351", "283", "1 253"],
          ["Avril 2026", "628", "347", "271", "1 246"],
          ["Mai 2026", "615", "356", "286", "1 257"],
          ["Juin 2026", "622", "349", "278", "1 249"],
          ["Juillet 2026", "609", "343", "282", "1 234"],
          ["Août 2026", "617", "354", "275", "1 246"],
          ["Septembre 2026", "626", "350", "287", "1 263"],
        ],
      );
      paragraphe(
        ctx,
        "Total des douze mois : 14 952 €. Mode de perception linéaire, sans prime de production ni rappel exceptionnel sur la période.",
        9,
      );
    },
  },
  CONVENTIONS: {
    fileName: "conventions-courtage.pdf",
    titre: "Conventions de courtage avec les compagnies",
    remplir(ctx: Ctx) {
      paragraphe(
        ctx,
        "État des conventions en vigueur. Chaque convention est transmise dans son intégralité à l'acquéreur lors de la vérification des pièces.",
      );
      tableau(
        ctx,
        ["Compagnie", "Signée le", "Taux", "Exclusivité"],
        [
          ["AXA", "12/03/2019", "11,5 %", "Non"],
          ["Generali", "04/09/2020", "10,0 %", "Non"],
          ["April", "22/01/2021", "12,0 %", "Non"],
        ],
      );
      sousTitre(ctx, "Clauses communes");
      paragraphe(
        ctx,
        "Les conventions sont à durée indéterminée, résiliables par chaque partie avec un préavis de trois mois. Elles prévoient la reprise des commissions en cas de résiliation d'un contrat dans les douze mois suivant sa souscription.",
      );
      sousTitre(ctx, "Transfert");
      paragraphe(
        ctx,
        "Aucune convention ne comporte de clause interdisant la cession du portefeuille. Chaque compagnie donne son accord au transfert après présentation de l'acquéreur et vérification de son immatriculation ORIAS.",
      );
    },
  },
} as const;

type Kind = keyof typeof PIECES;
const KINDS = Object.keys(PIECES) as Kind[];

/** Une seule copie par piece : le cabinet est le meme pour tout le catalogue. */
export function demoStorageKey(kind: Kind): string {
  return `cabinet/${CATALOG_SELLER.id}/demo/${PIECES[kind].fileName}`;
}

async function main() {
  const sortie = process.argv[2];
  if (!sortie) {
    console.error("Usage : npx tsx scripts/write-demo-company-docs.ts <dossier de sortie>");
    process.exit(1);
  }
  mkdirSync(sortie, { recursive: true });

  const sql = (v: string) => `'${v.replace(/'/g, "''")}'`;
  const lignes: string[] = [
    "-- Pieces du cabinet pour les annonces de demonstration du catalogue.",
    "-- Genere par scripts/write-demo-company-docs.ts, ne pas modifier a la main.",
    "DELETE FROM ListingCompanyDocument WHERE id LIKE 'cdoc_demo_%';",
  ];

  for (const kind of KINDS) {
    const piece = PIECES[kind];
    const bytes = await document(piece.titre, piece.remplir);
    writeFileSync(join(sortie, piece.fileName), bytes);
    for (let i = 1; i <= CATALOG_COUNT; i += 1) {
      const listingId = `lst_catalog_${String(i).padStart(2, "0")}`;
      lignes.push(
        `INSERT INTO ListingCompanyDocument (id, listingId, kind, fileName, storageKey, sha256, uploadedById, createdAt) SELECT ${[
          `cdoc_demo_${String(i).padStart(2, "0")}_${kind.toLowerCase()}`,
          listingId,
          kind,
          piece.fileName,
          demoStorageKey(kind),
          "demo",
          CATALOG_SELLER.id,
          CATALOG_FIRM.foundedAt,
        ]
          .map(sql)
          .join(", ")} WHERE EXISTS (SELECT 1 FROM Listing WHERE id = ${sql(listingId)});`,
      );
    }
  }

  const chemin = "scripts/d1-demo-company-docs.sql";
  writeFileSync(chemin, `${lignes.join("\n")}\n`);
  console.log(`${KINDS.length} PDF dans ${sortie}, ${lignes.length - 3} lignes dans ${chemin}`);
  for (const kind of KINDS) console.log(`  ${PIECES[kind].fileName} -> ${demoStorageKey(kind)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
