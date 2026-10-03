import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  SIMPLE_FEE_LABEL,
  SUCCESS_FEE_FLOOR_EUR,
  VERIFIED_FEE_RANGE_LABEL,
  VERIFIED_FEE_RATE_MAX,
  VERIFIED_FEE_RATE_MIN,
  successFeeFor,
} from "@/lib/billing/rates";
import { BRAND_NAME } from "@/lib/site";
import { roundedRange, type ValuationStudy } from "@/lib/listing/valuation-study-model";

/**
 * Dossier de présentation et de valorisation, anonymisé.
 *
 * Mise en page calquée sur un dossier de place : couverture à métadonnées,
 * engagement de confidentialité, synthèse chiffrée, camembert et histogramme,
 * tableau de commissions, fourchette, honoraires, prochaines étapes.
 */

const A4 = { w: 595.28, h: 841.89 };
const MARGE = 44;
const LARGEUR = A4.w - MARGE * 2;

const NAVY = rgb(0.067, 0.094, 0.153);
const NAVY_2 = rgb(0.118, 0.227, 0.541);
const BLEU = rgb(0.145, 0.388, 0.922);
const BLEU_PALE = rgb(0.937, 0.965, 1);
const PAGE = rgb(0.973, 0.98, 0.988);
const ENCRE = rgb(0.067, 0.094, 0.153);
const GRIS = rgb(0.373, 0.42, 0.478);
const TRAIT = rgb(0.898, 0.906, 0.922);
const BLANC = rgb(1, 1, 1);
const TRANCHE = [
  rgb(0.145, 0.388, 0.922),
  rgb(0.31, 0.275, 0.898),
  rgb(0.027, 0.494, 0.549),
  rgb(0.016, 0.47, 0.337),
  rgb(0.706, 0.325, 0.035),
  rgb(0.58, 0.64, 0.72),
];

const dateFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  charset: Set<number>;
  pages: PDFPage[];
  euro: string;
};

function lisible(ctx: Ctx, texte: string): string {
  const remplace = texte
    .replace(/[   ]/g, " ")
    .replace(/[‐-‒—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€/g, ctx.euro);
  let out = "";
  for (const ch of remplace) out += ctx.charset.has(ch.codePointAt(0)!) ? ch : "?";
  return out;
}

function largeur(ctx: Ctx, texte: string, taille: number, gras = false) {
  return (gras ? ctx.bold : ctx.regular).widthOfTextAtSize(lisible(ctx, texte), taille);
}

function ecrire(
  ctx: Ctx,
  texte: string,
  x: number,
  y: number,
  taille: number,
  opts: { gras?: boolean; couleur?: RGB } = {},
) {
  ctx.page.drawText(lisible(ctx, texte), {
    x,
    y,
    size: taille,
    font: opts.gras ? ctx.bold : ctx.regular,
    color: opts.couleur ?? ENCRE,
  });
}

function couper(ctx: Ctx, texte: string, taille: number, max: number, gras = false): string[] {
  const lignes: string[] = [];
  for (const paragraphe of texte.split(/\n+/)) {
    let courante = "";
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (largeur(ctx, essai, taille, gras) <= max) courante = essai;
      else {
        if (courante) lignes.push(courante);
        courante = mot;
      }
    }
    if (courante) lignes.push(courante);
  }
  return lignes;
}

function euro(ctx: Ctx, v: number, cents = false) {
  const n = cents
    ? v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(v).toLocaleString("fr-FR");
  return `${n} ${ctx.euro}`;
}

function multiple(v: number) {
  return `x${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(share: number, digits = 0) {
  return `${(share * 100).toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`;
}

function nouvellePage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([A4.w, A4.h]);
  ctx.pages.push(ctx.page);
  ctx.page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: PAGE });
  ctx.y = A4.h - 56;
}

function bandeauInterieur(ctx: Ctx, study: ValuationStudy) {
  ctx.page.drawRectangle({ x: 0, y: A4.h - 36, width: A4.w, height: 36, color: NAVY });
  ecrire(ctx, BRAND_NAME.toUpperCase(), MARGE, A4.h - 23, 8, { gras: true, couleur: BLANC });
  const droit = study.publicNumber ? `Dossier n. ${study.publicNumber}` : "Estimation confidentielle";
  ecrire(ctx, droit, A4.w - MARGE - largeur(ctx, droit, 8), A4.h - 23, 8, { couleur: BLANC });
}

function pied(ctx: Ctx, study: ValuationStudy) {
  const total = ctx.pages.length;
  const dossier = study.publicNumber ? `Dossier n. ${study.publicNumber}` : "Estimation de portefeuille";
  ctx.pages.forEach((pg, i) => {
    if (i === 0) return;
    ctx.page = pg;
    pg.drawLine({ start: { x: MARGE, y: 32 }, end: { x: A4.w - MARGE, y: 32 }, thickness: 0.6, color: TRAIT });
    ecrire(ctx, `Document strictement confidentiel  ·  ${dossier}  ·  ${BRAND_NAME}`, MARGE, 20, 7, { couleur: GRIS });
    const n = `${i} / ${total - 1}`;
    ecrire(ctx, n, A4.w - MARGE - largeur(ctx, n, 7), 20, 7, { couleur: GRIS });
  });
}

function place(ctx: Ctx, hauteur: number, study: ValuationStudy) {
  if (ctx.y - hauteur < 48) {
    nouvellePage(ctx);
    bandeauInterieur(ctx, study);
    ctx.y = A4.h - 56;
  }
}

function titreSection(ctx: Ctx, study: ValuationStudy, titre: string, sous?: string) {
  place(ctx, sous ? 52 : 36, study);
  ctx.page.drawRectangle({ x: MARGE, y: ctx.y - 4, width: 18, height: 4, color: BLEU });
  ecrire(ctx, titre, MARGE, ctx.y - 22, 16, { gras: true });
  ctx.y -= 28;
  if (sous) {
    for (const l of couper(ctx, sous, 10, LARGEUR)) {
      ecrire(ctx, l, MARGE, ctx.y - 2, 10, { couleur: GRIS });
      ctx.y -= 13;
    }
    ctx.y -= 4;
  }
}

function paragraphe(ctx: Ctx, study: ValuationStudy, texte: string, taille = 10, largeurMax = LARGEUR) {
  for (const l of couper(ctx, texte, taille, largeurMax)) {
    place(ctx, 15, study);
    ecrire(ctx, l, MARGE, ctx.y - 11, taille);
    ctx.y -= 14;
  }
}

function carte(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: BLANC,
    borderColor: TRAIT,
    borderWidth: 0.8,
  });
}

function kpis(ctx: Ctx, study: ValuationStudy, cartes: { label: string; value: string; note?: string }[]) {
  const gap = 8;
  const w = (LARGEUR - gap * (cartes.length - 1)) / cartes.length;
  const h = 78;
  place(ctx, h + 10, study);
  cartes.forEach((c, i) => {
    const x = MARGE + i * (w + gap);
    const y = ctx.y - h;
    carte(ctx, x, y, w, h);
    ctx.page.drawRectangle({ x, y: y + h - 3, width: w, height: 3, color: BLEU });
    ecrire(ctx, c.label.toUpperCase(), x + 10, y + h - 18, 6.5, { gras: true, couleur: GRIS });
    const vals = couper(ctx, c.value, 13, w - 18, true);
    vals.slice(0, 2).forEach((v, j) => ecrire(ctx, v, x + 10, y + h - 38 - j * 14, 13, { gras: true, couleur: NAVY }));
    if (c.note) ecrire(ctx, c.note, x + 10, y + 10, 7, { couleur: GRIS });
  });
  ctx.y -= h + 12;
}

function barreEmpilee(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  parts: { label: string; share: number }[],
) {
  let ox = x;
  const total = parts.reduce((s, p) => s + p.share, 0) || 1;
  parts.forEach((p, i) => {
    const bw = Math.max(p.share > 0 ? 3 : 0, (p.share / total) * w);
    if (bw <= 0) return;
    ctx.page.drawRectangle({ x: ox, y, width: bw, height: h, color: TRANCHE[i % TRANCHE.length] });
    if (bw > 36) {
      const t = pct(p.share);
      ecrire(ctx, t, ox + bw / 2 - largeur(ctx, t, 9, true) / 2, y + h / 2 - 3, 9, { gras: true, couleur: BLANC });
    }
    ox += bw;
  });
}

function histogramme(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  parts: { label: string; value: number }[],
  unite: (v: number) => string,
) {
  const max = Math.max(...parts.map((p) => p.value), 0.0001);
  const gap = 10;
  const barW = Math.min(48, (w - gap * (parts.length - 1)) / Math.max(parts.length, 1));
  ctx.page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.6, color: TRAIT });
  parts.forEach((p, i) => {
    const bh = Math.max(4, (p.value / max) * (h - 28));
    const bx = x + i * (barW + gap);
    ctx.page.drawRectangle({ x: bx, y, width: barW, height: bh, color: TRANCHE[i % TRANCHE.length] });
    const val = unite(p.value);
    ecrire(ctx, val, bx + barW / 2 - largeur(ctx, val, 7, true) / 2, y + bh + 4, 7, { gras: true });
    const lab = couper(ctx, p.label, 7, barW + 8)[0] ?? p.label;
    ecrire(ctx, lab, bx + barW / 2 - largeur(ctx, lab, 7) / 2, y - 12, 7, { couleur: GRIS });
  });
}

function legend(ctx: Ctx, x: number, y: number, parts: { label: string; share: number }[]) {
  parts.forEach((p, i) => {
    ctx.page.drawRectangle({ x, y: y - i * 14, width: 8, height: 8, color: TRANCHE[i % TRANCHE.length] });
    ecrire(ctx, `${p.label}  (${pct(p.share)})`, x + 14, y - i * 14, 8);
  });
}

export async function renderValuationStudyPdf(study: ValuationStudy): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Dossier de présentation et de valorisation${study.publicNumber ? ` · n. ${study.publicNumber}` : ""}`);
  doc.setAuthor(BRAND_NAME);
  doc.setSubject(study.headline);
  doc.setCreationDate(study.issuedAt);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const charset = new Set(regular.getCharacterSet());
  const euroGlyph = charset.has("€".codePointAt(0)!) ? "€" : charset.has(128) ? String.fromCharCode(128) : "EUR";
  const page = doc.addPage([A4.w, A4.h]);
  const ctx: Ctx = { doc, page, y: A4.h, regular, bold, charset, pages: [page], euro: euroGlyph };

  const range = roundedRange(study.lowValue, study.highValue);
  const fourchette = `${euro(ctx, range.low)} - ${euro(ctx, range.high)}`;
  const implicite = `Multiple implicite : ${multiple(study.lowMultiple)} à ${multiple(study.highMultiple)}`;

  // ── 1. Couverture ──────────────────────────────────────────────
  ctx.page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: NAVY });
  ctx.page.drawRectangle({ x: 0, y: 0, width: 10, height: A4.h, color: BLEU });
  ecrire(ctx, BRAND_NAME.toUpperCase(), MARGE + 8, A4.h - 52, 9, { gras: true, couleur: rgb(0.75, 0.84, 0.99) });
  ecrire(ctx, "DOSSIER DE PRÉSENTATION & DE VALORISATION", MARGE + 8, A4.h - 150, 10, {
    gras: true,
    couleur: rgb(0.75, 0.84, 0.99),
  });
  const titre = couper(ctx, study.headline, 28, LARGEUR - 20, true);
  titre.slice(0, 3).forEach((l, i) => ecrire(ctx, l, MARGE + 8, A4.h - 196 - i * 32, 28, { gras: true, couleur: BLANC }));
  ecrire(ctx, "Cession de portefeuille  -  analyse confidentielle", MARGE + 8, A4.h - 310, 12, {
    couleur: rgb(0.75, 0.84, 0.99),
  });

  const metas = [
    { k: "DOSSIER N.", v: study.publicNumber ? String(study.publicNumber) : "Estimation" },
    { k: "LOCALISATION", v: study.zone },
    { k: "DONNÉES ARRÊTÉES AU", v: dateFr(study.dataCutoff) },
    { k: "CONFIDENTIALITÉ", v: "Document anonymisé" },
  ];
  const mw = (LARGEUR - 24) / 2;
  const mh = 58;
  metas.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGE + 8 + col * (mw + 12);
    const y = 148 - row * (mh + 14);
    ctx.page.drawRectangle({ x, y, width: mw, height: mh, color: rgb(0.09, 0.14, 0.28) });
    ecrire(ctx, m.k, x + 12, y + mh - 18, 7, { gras: true, couleur: rgb(0.75, 0.84, 0.99) });
    const vals = couper(ctx, m.v, 12, mw - 24, true);
    vals.slice(0, 2).forEach((v, j) => ecrire(ctx, v, x + 12, y + mh - 36 - j * 14, 12, { gras: true, couleur: BLANC }));
  });
  ecrire(ctx, `Présenté par ${BRAND_NAME}`, MARGE + 8, 36, 10, { couleur: BLANC });

  // ── 2. Confidentialité ─────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(
    ctx,
    study,
    "Avertissement & engagement de confidentialité",
    study.publicNumber
      ? `Dossier de vente n. ${study.publicNumber} - conditions d'accès aux informations confidentielles.`
      : "Estimation de portefeuille - conditions d'accès aux informations confidentielles.",
  );
  paragraphe(
    ctx,
    study,
    "Ce document reprend les éléments communiqués pour évaluer l'opportunité. Il ne nomme pas le cédant. En y accédant, vous acceptez les obligations suivantes.",
  );
  ctx.y -= 8;
  const clauses = [
    { n: "1", t: "Aucune communication", d: "Aucun communiqué concernant votre intérêt pour le rachat du portefeuille ne devra être fait sans l'accord préalable de la plateforme et du cédant." },
    { n: "2", t: "Non-contact", d: "Vous acceptez de ne pas entrer en contact avec les fournisseurs ni les collaborateurs du cédant. Cette clause s'étend à l'ensemble des employés, collaborateurs et conseils de votre organisation." },
    { n: "3", t: "Confidentialité des informations", d: "Les informations permettant d'identifier le cédant, ses opérations et son profil financier, ainsi que vos études, resteront confidentielles et ne seront transmises qu'aux conseils ayant besoin d'en connaître." },
    { n: "4", t: "Absence de garantie", d: `${BRAND_NAME} ne pourra être tenu pour responsable de l'inexactitude éventuelle d'informations transmises tout au long du processus conduisant à la présentation d'une offre.` },
  ];
  const cw = (LARGEUR - 10) / 2;
  const ch = 118;
  clauses.forEach((c, i) => {
    const col = i % 2;
    if (col === 0) place(ctx, ch + 10, study);
    const x = MARGE + col * (cw + 10);
    const y = ctx.y - ch;
    carte(ctx, x, y, cw, ch);
    ctx.page.drawCircle({ x: x + 22, y: y + ch - 28, size: 11, color: BLEU_PALE });
    ecrire(ctx, c.n, x + 18.5, y + ch - 32, 11, { gras: true, couleur: BLEU });
    const titres = couper(ctx, c.t, 10, cw - 52, true);
    titres.forEach((l, j) => ecrire(ctx, l, x + 40, y + ch - 32 - j * 12, 10, { gras: true }));
    let ty = y + ch - 52;
    for (const l of couper(ctx, c.d, 8.5, cw - 24)) {
      ecrire(ctx, l, x + 14, ty, 8.5, { couleur: GRIS });
      ty -= 11;
    }
    if (col === 1 || i === clauses.length - 1) ctx.y -= ch + 10;
  });

  // ── 3. Qui sommes-nous ─────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(ctx, study, "Qui sommes-nous ?");
  const introW = LARGEUR * 0.48;
  let iy = ctx.y;
  for (const l of couper(
    ctx,
    `${BRAND_NAME} accompagne courtiers et repreneurs dans la cession et l'acquisition de portefeuilles d'assurance. L'étude du portefeuille précède toute mise en ligne : ce n'est pas le cédant qui fixe le prix. Les dossiers certifiés sont ouverts, contrôlés et chiffrés avant d'être présentés.`,
    10,
    introW,
  )) {
    ecrire(ctx, l, MARGE, iy - 11, 10);
    iy -= 14;
  }
  const stats = [
    { v: `0 ${ctx.euro === "EUR" ? "EUR" : ctx.euro}`, l: "Pour mettre en vente" },
    { v: "< 1 sem.", l: "Délai moyen constaté" },
    { v: "50+", l: "Points de contrôle" },
    { v: "Alias", l: "Jusqu'au dépôt d'intérêt" },
  ];
  const sx = MARGE + introW + 16;
  const sw = LARGEUR - introW - 16;
  const sh = 52;
  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = sx + col * (sw / 2 + 6);
    const y = ctx.y - 8 - row * (sh + 8) - sh;
    carte(ctx, x, y, sw / 2 - 6, sh);
    ecrire(ctx, s.v, x + 10, y + 28, 14, { gras: true, couleur: BLEU });
    ecrire(ctx, s.l, x + 10, y + 12, 7.5, { couleur: GRIS });
  });
  ctx.y = Math.min(iy, ctx.y - 8 - 2 * (sh + 8)) - 20;
  paragraphe(
    ctx,
    study,
    "Dès que l'acquéreur se positionne, un dépôt de 2,5 % est versé dans un trust pour lancer la procédure de cession. La mise en vente est sans frais ; des honoraires ne sont dus que si la vente aboutit.",
  );

  // ── 4. Synthèse ────────────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(ctx, study, "Synthèse de l'opportunité", `${study.headline}, à commissionnement récurrent.`);
  kpis(ctx, study, [
    { label: "Contrats actifs", value: study.contractCount.toLocaleString("fr-FR"), note: `sur ${study.carrierCount} compagnie${study.carrierCount > 1 ? "s" : ""}` },
    { label: "Commissions / mois", value: euro(ctx, study.monthlyCommissions, true), note: "base annualisée / 12" },
    { label: "Commissions / an", value: euro(ctx, study.annualCommissions, true), note: "commissions nettes" },
    { label: "Concentration", value: String(study.carrierCount), note: study.topCarrier ? study.topCarrier.name : "compagnies" },
  ]);

  const leftW = LARGEUR * 0.55;
  const rightW = LARGEUR - leftW - 12;
  ecrire(ctx, "Points clés", MARGE, ctx.y - 4, 11, { gras: true });
  let py = ctx.y - 20;
  for (const point of study.keyPoints) {
    ctx.page.drawCircle({ x: MARGE + 4, y: py + 3, size: 2.2, color: BLEU });
    const lignes = couper(ctx, point, 9, leftW - 16);
    lignes.forEach((l, i) => ecrire(ctx, l, MARGE + 14, py - i * 12, 9));
    py -= lignes.length * 12 + 8;
  }
  const boxH = 118;
  const bx = MARGE + leftW + 12;
  const by = ctx.y - boxH;
  ctx.page.drawRectangle({ x: bx, y: by, width: rightW, height: boxH, color: NAVY });
  ecrire(ctx, "VALORISATION RETENUE", bx + 14, by + boxH - 22, 8, { gras: true, couleur: rgb(0.75, 0.84, 0.99) });
  const fl = couper(ctx, fourchette, 13, rightW - 28, true);
  fl.forEach((l, i) => ecrire(ctx, l, bx + 14, by + boxH - 46 - i * 16, 13, { gras: true, couleur: BLANC }));
  const il = couper(ctx, `${implicite} des commissions annuelles récurrentes`, 8, rightW - 28);
  il.forEach((l, i) => ecrire(ctx, l, bx + 14, by + 28 - i * 11, 8, { couleur: rgb(0.75, 0.84, 0.99) }));
  ctx.y = Math.min(py, by) - 16;

  // ── 5. Anatomie ────────────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(
    ctx,
    study,
    "Anatomie du portefeuille",
    `Répartition des ${study.contractCount} contrats actifs et de leurs commissions par branche.`,
  );
  const pieParts = study.byBranch.map((s) => ({ label: s.label, share: s.share, value: s.contracts }));
  ecrire(ctx, "Contrats par branche", MARGE, ctx.y - 8, 10, { gras: true });
  ctx.y -= 22;
  barreEmpilee(ctx, MARGE, ctx.y - 28, LARGEUR, 28, pieParts);
  ctx.y -= 44;
  legend(ctx, MARGE, ctx.y, pieParts.slice(0, 6));
  ctx.y -= Math.min(pieParts.length, 6) * 14 + 18;
  ecrire(ctx, "Commissions annuelles par branche", MARGE, ctx.y, 10, { gras: true });
  ctx.y -= 18;
  histogramme(
    ctx,
    MARGE + 8,
    ctx.y - 150,
    LARGEUR - 16,
    150,
    study.byBranch.map((s) => ({ label: s.label, value: s.value })),
    (v) => euro(ctx, v),
  );
  ctx.y -= 178;
  if (study.topCarrier) {
    titreSection(ctx, study, "Nature des contrats");
    paragraphe(
      ctx,
      study,
      study.carrierCount === 1
        ? `Portefeuille concentré à 100 % chez ${study.topCarrier.name}. ${study.keyPoints[0] ?? ""}`
        : `Compagnie principale : ${study.topCarrier.name} (${pct(study.topCarrier.share)} des commissions).`,
    );
  }

  // ── 6. Structure ───────────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(
    ctx,
    study,
    "Structure des commissions",
    "Décomposition des commissions annuelles nettes par branche, base retenue pour la valorisation.",
  );
  const rows = [
    ...study.byBranch.map((s) => ({ label: s.label, contracts: s.contracts, value: s.value, total: false })),
    { label: "Total net annuel", contracts: study.contractCount, value: study.annualCommissions, total: true },
  ];
  const rowH = 22;
  place(ctx, 28 + rows.length * rowH, study);
  ctx.page.drawRectangle({ x: MARGE, y: ctx.y - 22, width: LARGEUR, height: 22, color: NAVY });
  ecrire(ctx, "Branche", MARGE + 10, ctx.y - 15, 8, { gras: true, couleur: BLANC });
  ecrire(ctx, "Contrats", MARGE + 250, ctx.y - 15, 8, { gras: true, couleur: BLANC });
  ecrire(ctx, "Commissions / an", MARGE + 360, ctx.y - 15, 8, { gras: true, couleur: BLANC });
  ctx.y -= 22;
  rows.forEach((r, i) => {
    ctx.page.drawRectangle({
      x: MARGE,
      y: ctx.y - rowH,
      width: LARGEUR,
      height: rowH,
      color: r.total ? BLEU_PALE : i % 2 === 0 ? BLANC : rgb(0.98, 0.984, 0.99),
    });
    ecrire(ctx, r.label, MARGE + 10, ctx.y - 15, 9.5, { gras: r.total });
    ecrire(ctx, String(r.contracts), MARGE + 250, ctx.y - 15, 9.5, { gras: r.total });
    ecrire(ctx, euro(ctx, r.value, true), MARGE + 360, ctx.y - 15, 9.5, { gras: r.total });
    ctx.y -= rowH;
  });
  ctx.y -= 14;
  ctx.page.drawRectangle({ x: MARGE, y: ctx.y - 44, width: LARGEUR, height: 44, color: NAVY });
  ecrire(ctx, "BASE ANNUALISÉE", MARGE + 14, ctx.y - 16, 7.5, { gras: true, couleur: rgb(0.75, 0.84, 0.99) });
  ecrire(ctx, `Commissions annuelles nettes : ${euro(ctx, study.annualCommissions, true)}`, MARGE + 14, ctx.y - 34, 12, {
    gras: true,
    couleur: BLANC,
  });
  ctx.y -= 58;
  kpis(ctx, study, [
    { label: "Commission moyenne", value: euro(ctx, study.averageCommissionPerContract, true), note: "par contrat / an" },
    {
      label: "Amplitude",
      value:
        study.byBranch.length > 0
          ? `${euro(ctx, Math.min(...study.byBranch.map((s) => s.value)))} à ${euro(ctx, Math.max(...study.byBranch.map((s) => s.value)))}`
          : "-",
      note: "par branche",
    },
    {
      label: "Compagnies partenaires",
      value: String(study.carrierCount),
      note: study.topCarrier ? `${study.topCarrier.name} : ${pct(study.topCarrier.share)}` : "",
    },
    { label: "Périodicité", value: "Récurrente", note: study.headline.replace(/^Portefeuille /i, "") },
  ]);
  paragraphe(ctx, study, study.sourceNote, 8);

  // ── 7. Valorisation ────────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(ctx, study, "Valorisation retenue", "Fourchette de valorisation appliquée aux commissions annuelles récurrentes.");
  place(ctx, 100, study);
  ctx.page.drawRectangle({ x: MARGE, y: ctx.y - 92, width: LARGEUR, height: 92, color: NAVY });
  ecrire(ctx, "VALORISATION RETENUE", MARGE + 20, ctx.y - 24, 9, { gras: true, couleur: rgb(0.75, 0.84, 0.99) });
  ecrire(ctx, fourchette, MARGE + 20, ctx.y - 52, 22, { gras: true, couleur: BLANC });
  ecrire(ctx, `${implicite} des commissions nettes`, MARGE + 20, ctx.y - 74, 10, { couleur: rgb(0.75, 0.84, 0.99) });
  ctx.y -= 108;
  kpis(ctx, study, [
    { label: "Commissions / an", value: euro(ctx, study.annualCommissions, true), note: "base de la valorisation" },
    { label: "Contrats actifs", value: study.contractCount.toLocaleString("fr-FR"), note: study.headline.replace(/^Portefeuille /i, "") },
    {
      label: "Fournisseur",
      value: study.carrierCount === 1 && study.topCarrier ? study.topCarrier.name : `${study.carrierCount} compagnies`,
      note: study.topCarrier && study.carrierCount === 1 ? "100 % des commissions" : "",
    },
    { label: "Multiple implicite", value: `${multiple(study.lowMultiple)} à ${multiple(study.highMultiple)}`, note: "sur commissions nettes" },
  ]);
  carte(ctx, MARGE, ctx.y - 72, LARGEUR, 72);
  ecrire(ctx, "MÉTHODE DE VALORISATION", MARGE + 14, ctx.y - 18, 8, { gras: true, couleur: BLEU });
  let my = ctx.y - 34;
  for (const l of couper(
    ctx,
    `Valorisation obtenue par application d'un multiple de marché, corrigé par la cascade interne, aux commissions annuelles nettes (${euro(ctx, study.annualCommissions, true)}), en tenant compte de la structure, de l'ancienneté, de la résiliation et de l'accompagnement. Le multiple définitif dépend de la qualité de l'audit, de l'attrition constatée et des conditions de reprise.`,
    9,
    LARGEUR - 28,
  )) {
    ecrire(ctx, l, MARGE + 14, my, 9);
    my -= 12;
  }
  ctx.y -= 84;

  // ── 8. Honoraires ──────────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(ctx, study, "Opportunité - prix de vente & honoraires", "Synthèse de l'opportunité de portefeuille de courtage en assurance.");
  const blocTop = ctx.y;
  const facts = [
    { k: "LOCALISATION", v: study.zone },
    { k: "FOURNISSEUR PRINCIPAL", v: study.topCarrier?.name ?? "Plusieurs compagnies" },
    { k: "NOMBRE DE CONTRATS", v: study.contractCount.toLocaleString("fr-FR") },
    { k: "COMMISSIONS ANNUELLES", v: euro(ctx, study.annualCommissions, true) },
    { k: "VALEUR ESTIMÉE", v: `${fourchette} net vendeur` },
  ];
  const factW = LARGEUR * 0.48;
  facts.forEach((f) => {
    ecrire(ctx, f.k, MARGE, ctx.y - 11, 7, { gras: true, couleur: GRIS });
    const vals = couper(ctx, f.v, 11, factW - 8, true);
    vals.forEach((v, i) => ecrire(ctx, v, MARGE, ctx.y - 26 - i * 13, 11, { gras: true }));
    ctx.y -= 40;
  });
  const feeMin = successFeeFor(range.low, VERIFIED_FEE_RATE_MIN);
  const feeMax = successFeeFor(range.high, VERIFIED_FEE_RATE_MAX);
  const feeX = MARGE + factW + 16;
  const feeW = LARGEUR - factW - 16;
  carte(ctx, feeX, blocTop - 100, feeW, 96);
  ecrire(ctx, "Annonce simple", feeX + 14, blocTop - 24, 9, { gras: true, couleur: GRIS });
  ecrire(ctx, SIMPLE_FEE_LABEL, feeX + 14, blocTop - 48, 16, { gras: true, couleur: NAVY });
  ecrire(ctx, "Mise en vente sans commission", feeX + 14, blocTop - 68, 8, { couleur: GRIS });
  ecrire(ctx, "Aucun honoraire si la vente n'aboutit pas", feeX + 14, blocTop - 82, 8, { couleur: GRIS });
  carte(ctx, feeX, blocTop - 214, feeW, 100);
  ecrire(ctx, "Portefeuille certifié", feeX + 14, blocTop - 132, 9, { gras: true, couleur: GRIS });
  const feeLine = couper(ctx, `${euro(ctx, feeMin)} - ${euro(ctx, feeMax)} HT`, 12, feeW - 28, true);
  feeLine.forEach((l, i) => ecrire(ctx, l, feeX + 14, blocTop - 156 - i * 14, 12, { gras: true, couleur: NAVY }));
  ecrire(ctx, `${VERIFIED_FEE_RANGE_LABEL} du prix`, feeX + 14, blocTop - 186, 8, { couleur: GRIS });
  ecrire(ctx, `Minimum ${euro(ctx, SUCCESS_FEE_FLOOR_EUR)} HT`, feeX + 14, blocTop - 200, 8, { couleur: GRIS });
  ctx.y = Math.min(ctx.y, blocTop - 230);
  paragraphe(
    ctx,
    study,
    "Inclus dans l'option certifiée : contrôle du dossier, cadre contractuel et sécurisation du paiement. Les honoraires sont dus uniquement si la vente aboutit.",
  );

  // ── 9. Prochaines étapes ───────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(
    ctx,
    study,
    "Cadre d'intermédiation & prochaines étapes",
    `${BRAND_NAME} accompagne la cession de bout en bout, dans un cadre sécurisé et confidentiel.`,
  );
  const etapes = [
    { n: "01", t: "Audit & validation", d: "Vérification du périmètre net, des quittances et de l'antériorité des contrats." },
    { n: "02", t: "Mise en relation", d: "Présentation qualifiée de l'opportunité à des repreneurs ciblés, sous confidentialité." },
    { n: "03", t: "Négociation", d: "Cadrage du prix dans la fourchette de valorisation et des modalités de reprise." },
    { n: "04", t: "Sécurisation", d: "Conservation des fonds jusqu'à la signature des contrats, puis versement au cédant." },
  ];
  const ew = (LARGEUR - 24) / 4;
  place(ctx, 150, study);
  etapes.forEach((e, i) => {
    const x = MARGE + i * (ew + 8);
    carte(ctx, x, ctx.y - 140, ew, 140);
    ecrire(ctx, e.n, x + 12, ctx.y - 28, 16, { gras: true, couleur: BLEU });
    const tl = couper(ctx, e.t, 10, ew - 20, true);
    tl.forEach((l, j) => ecrire(ctx, l, x + 12, ctx.y - 50 - j * 13, 10, { gras: true }));
    let dy = ctx.y - 78;
    for (const l of couper(ctx, e.d, 8, ew - 22)) {
      ecrire(ctx, l, x + 12, dy, 8, { couleur: GRIS });
      dy -= 11;
    }
  });
  ctx.y -= 160;
  paragraphe(
    ctx,
    study,
    study.publicNumber
      ? `Pour échanger sur ce dossier : via la messagerie sécurisée, onglet Messages de l'annonce n. ${study.publicNumber}.`
      : "Prochaine étape : déposer le dossier pour étude, puis mise en ligne de l'annonce au prix déterminé.",
  );

  pied(ctx, study);
  return doc.save();
}
