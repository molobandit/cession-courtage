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

/*
 * La charte du dossier, celle de la plateforme.
 *
 * Un bleu et un seul, décliné du plus profond au plus pâle. Les couleurs de
 * tranche restent dans la même famille, du bleu vers l'indigo puis l'ardoise :
 * un camembert arc-en-ciel ferait graphique de tableur, et ce document se
 * présente à un acquéreur qui décide d'un achat.
 */
const NUIT = rgb(0.094, 0.165, 0.42);
const NUIT_CLAIR = rgb(0.137, 0.227, 0.525);
const NAVY = NUIT;
const NAVY_2 = rgb(0.118, 0.227, 0.541);
const BLEU = rgb(0.145, 0.388, 0.922);
const BLEU_CLAIR = rgb(0.506, 0.616, 0.953);
const BLEU_PALE = rgb(0.933, 0.949, 1);
const PAGE = rgb(0.988, 0.992, 1);
const ENCRE = rgb(0.094, 0.133, 0.231);
const GRIS = rgb(0.392, 0.443, 0.525);
const TRAIT = rgb(0.886, 0.906, 0.949);
const BLANC = rgb(1, 1, 1);
const TRANCHE = [
  rgb(0.118, 0.227, 0.541),
  rgb(0.145, 0.388, 0.922),
  rgb(0.306, 0.51, 0.957),
  rgb(0.447, 0.616, 0.969),
  rgb(0.584, 0.706, 0.98),
  rgb(0.722, 0.796, 0.988),
  rgb(0.835, 0.871, 0.945),
  rgb(0.886, 0.906, 0.949),
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

/**
 * Un anneau de répartition, tracé en arcs.
 *
 * Chaque part devient un secteur de couronne : arc extérieur dans le sens des
 * aiguilles, arc intérieur en sens inverse, et le chemin se referme. Le trou
 * du milieu porte le chiffre qui compte, ce qu'un camembert plein ne permet
 * pas. Les parts sous un pour cent sont regroupées en fin de liste par
 * l'appelant : un filet de 0,3 degré ne se voit pas et salit le tracé.
 */
function anneau(
  ctx: Ctx,
  cx: number,
  cy: number,
  rayon: number,
  epaisseur: number,
  parts: { share: number; couleur: RGB }[],
) {
  const ri = rayon - epaisseur;
  let angle = 0;
  const point = (r: number, a: number) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  for (const part of parts) {
    const balaye = Math.max(0, Math.min(1, part.share)) * Math.PI * 2;
    if (balaye <= 0.0005) continue;
    const fin = angle + balaye;
    const grand = balaye > Math.PI ? 1 : 0;
    const chemin = [
      `M ${point(rayon, angle)}`,
      `A ${rayon} ${rayon} 0 ${grand} 1 ${point(rayon, fin)}`,
      `L ${point(ri, fin)}`,
      `A ${ri} ${ri} 0 ${grand} 0 ${point(ri, angle)}`,
      "Z",
    ].join(" ");
    ctx.page.drawSvgPath(chemin, { x: cx, y: cy, color: part.couleur, borderWidth: 0 });
    angle = fin;
  }
}

/** Une barre horizontale, pour une part : le fond pâle, puis la part remplie. */
function barre(ctx: Ctx, x: number, y: number, largeurTotale: number, part: number, couleur: RGB) {
  ctx.page.drawRectangle({ x, y, width: largeurTotale, height: 5, color: BLEU_PALE });
  const remplie = Math.max(2, Math.min(1, Math.max(0, part)) * largeurTotale);
  ctx.page.drawRectangle({ x, y, width: remplie, height: 5, color: couleur });
}

/** Le chiffre d'abord, son libellé ensuite : la lecture va du gros au petit. */
function chiffreCle(
  ctx: Ctx,
  x: number,
  y: number,
  valeur: string,
  libelle: string,
  precision: string,
  max: number,
  couleur: RGB = NUIT,
) {
  ecrire(ctx, valeur, x, y, 20, { gras: true, couleur });
  ecrire(ctx, libelle, x, y - 16, 9, { gras: true, couleur: ENCRE });
  if (precision) {
    couper(ctx, precision, 8, max)
      .slice(0, 2)
      .forEach((l, i) => ecrire(ctx, l, x, y - 28 - i * 9.5, 8, { couleur: GRIS }));
  }
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
  const droit = study.publicNumber ? `Dossier n° ${study.publicNumber}` : "Estimation confidentielle";
  ecrire(ctx, droit, A4.w - MARGE - largeur(ctx, droit, 8), A4.h - 23, 8, { couleur: BLANC });
}

function pied(ctx: Ctx, study: ValuationStudy) {
  const total = ctx.pages.length;
  const dossier = study.publicNumber ? `Dossier n° ${study.publicNumber}` : "Estimation de portefeuille";
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
  place(ctx, sous ? 64 : 44, study);
  ctx.page.drawRectangle({ x: MARGE, y: ctx.y - 4, width: 18, height: 4, color: BLEU });
  ecrire(ctx, titre, MARGE, ctx.y - 22, 16, { gras: true });
  ctx.y -= 38;
  if (sous) {
    for (const l of couper(ctx, sous, 10, LARGEUR)) {
      ecrire(ctx, l, MARGE, ctx.y - 10, 10, { couleur: GRIS });
      ctx.y -= 14;
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
  doc.setTitle(`Dossier de présentation et de valorisation${study.publicNumber ? ` · n° ${study.publicNumber}` : ""}`);
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
  /*
   * La couverture doit tenir toute seule.
   *
   * Un acquéreur en reçoit plusieurs : celle-ci dit en un coup d'œil de quel
   * portefeuille il s'agit, ce qu'il rapporte et ce qu'il coûte. Le dégradé
   * est simulé par des bandes, pdf-lib ne connaissant pas les dégradés : vingt
   * bandes du bleu nuit vers l'indigo, invisibles à l'œil une fois imprimées.
   */
  const BANDES = 20;
  for (let i = 0; i < BANDES; i += 1) {
    const t = i / (BANDES - 1);
    ctx.page.drawRectangle({
      x: 0,
      y: (A4.h / BANDES) * i,
      width: A4.w,
      height: A4.h / BANDES + 1,
      color: rgb(
        NUIT.red + (NUIT_CLAIR.red - NUIT.red) * t,
        NUIT.green + (NUIT_CLAIR.green - NUIT.green) * t,
        NUIT.blue + (NUIT_CLAIR.blue - NUIT.blue) * t,
      ),
    });
  }

  /*
   * Le filigrane : la marque, en très grand, débordant du bord droit.
   * Dessinée au trait et à peine plus claire que le fond, elle donne de la
   * profondeur sans jamais disputer la lecture au titre.
   */
  const FILIGRANE = rgb(0.157, 0.247, 0.541);
  const carreArrondi = (c: number, r: number) =>
    `M ${r} 0 H ${c - r} A ${r} ${r} 0 0 1 ${c} ${r} V ${c - r} A ${r} ${r} 0 0 1 ${c - r} ${c} H ${r} A ${r} ${r} 0 0 1 0 ${c - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  ctx.page.drawSvgPath(carreArrondi(230, 54), {
    x: A4.w - 150,
    y: 690,
    borderColor: FILIGRANE,
    borderWidth: 9,
  });
  ctx.page.drawSvgPath("M 0 118 A 118 118 0 0 1 118 0", {
    x: A4.w - 92,
    y: 626,
    borderColor: FILIGRANE,
    borderWidth: 9,
  });

  // Le liseré de gauche, signature de tous les documents de la maison.
  ctx.page.drawRectangle({ x: 0, y: 0, width: 7, height: A4.h, color: BLEU });

  // Le cartouche de marque : le carré de la plateforme, et son arc.
  ctx.page.drawSvgPath(carreArrondi(26, 7), { x: MARGE + 8, y: A4.h - 50, color: BLEU, borderWidth: 0 });
  ctx.page.drawSvgPath("M 0 13 A 13 13 0 0 1 13 0", {
    x: MARGE + 14.5,
    y: A4.h - 63.5,
    borderColor: BLANC,
    borderWidth: 2.2,
  });
  ecrire(ctx, BRAND_NAME, MARGE + 44, A4.h - 68, 12, { gras: true, couleur: BLANC });
  const sceau = "CONFIDENTIEL";
  const sceauL = largeur(ctx, sceau, 7, true) + 20;
  ctx.page.drawRectangle({
    x: A4.w - MARGE - sceauL - 8,
    y: A4.h - 72,
    width: sceauL,
    height: 18,
    borderColor: rgb(0.44, 0.55, 0.85),
    borderWidth: 0.8,
  });
  ecrire(ctx, sceau, A4.w - MARGE - sceauL + 2, A4.h - 66, 7, { gras: true, couleur: rgb(0.78, 0.85, 1) });

  ecrire(ctx, "DOSSIER DE PRÉSENTATION ET DE VALORISATION", MARGE + 8, A4.h - 232, 9, {
    gras: true,
    couleur: BLEU_CLAIR,
  });
  const titre = couper(ctx, study.headline, 30, LARGEUR - 40, true);
  titre.slice(0, 3).forEach((l, i) => ecrire(ctx, l, MARGE + 8, A4.h - 274 - i * 36, 30, { gras: true, couleur: BLANC }));

  const accroche = `${study.contractCount.toLocaleString("fr-FR")} contrats actifs, ${study.carrierCount} compagnie${study.carrierCount > 1 ? "s" : ""} partenaire${study.carrierCount > 1 ? "s" : ""}. Commissions récurrentes : ${euro(ctx, study.annualCommissions)}.`;
  const basTitre = A4.h - 274 - Math.min(titre.length, 3) * 36;
  couper(ctx, accroche, 12, LARGEUR - 60)
    .slice(0, 2)
    .forEach((l, i) => ecrire(ctx, l, MARGE + 8, basTitre - 14 - i * 18, 12, { couleur: rgb(0.78, 0.85, 1) }));

  /*
   * Les quatre chiffres que l'acquéreur cherche d'abord. Le montant est
   * détaché par un filet : c'est le seul des quatre qui est un prix.
   */
  const cles = [
    { v: euro(ctx, study.annualCommissions), k: "commissions annuelles nettes" },
    { v: study.contractCount.toLocaleString("fr-FR"), k: "contrats actifs" },
    { v: `${study.averageAgeMonths} mois`, k: "d'ancienneté moyenne" },
    { v: euro(ctx, study.midValue), k: "montant de l'annonce, net vendeur" },
  ];
  const colonne = (LARGEUR - 16) / 4;
  cles.forEach((c, i) => {
    const x = MARGE + 8 + i * colonne;
    if (i === 3) ctx.page.drawRectangle({ x: x - 16, y: 318, width: 0.8, height: 62, color: rgb(0.42, 0.53, 0.84) });
    ecrire(ctx, c.v, x, 356, 18, { gras: true, couleur: BLANC });
    couper(ctx, c.k, 7.5, colonne - 12)
      .slice(0, 2)
      .forEach((l, j) => ecrire(ctx, l, x, 338 - j * 10, 7.5, { couleur: rgb(0.72, 0.8, 0.98) }));
  });
  ctx.page.drawRectangle({ x: MARGE + 8, y: 296, width: LARGEUR - 16, height: 0.8, color: rgb(0.34, 0.45, 0.78) });

  /*
   * Le pied de couverture : quatre repères sur une ligne, sans cadre. Les
   * pavés d'avant faisaient formulaire administratif.
   */
  const metas = [
    { k: "DOSSIER N°", v: study.publicNumber ? String(study.publicNumber) : "Estimation" },
    { k: "LOCALISATION", v: study.zone },
    { k: "DONNÉES ARRÊTÉES AU", v: dateFr(study.dataCutoff) },
    { k: "CONFIDENTIALITÉ", v: "Document anonymisé" },
  ];
  metas.forEach((m, i) => {
    const x = MARGE + 8 + i * colonne;
    ecrire(ctx, m.k, x, 252, 7, { gras: true, couleur: rgb(0.6, 0.7, 0.95) });
    couper(ctx, m.v, 10, colonne - 12, true)
      .slice(0, 2)
      .forEach((l, j) => ecrire(ctx, l, x, 236 - j * 12, 10, { gras: true, couleur: BLANC }));
  });

  ecrire(ctx, `Présenté par ${BRAND_NAME}. La salle de marché des portefeuilles d'assurance.`, MARGE + 8, 44, 9, {
    couleur: rgb(0.6, 0.7, 0.95),
  });

  // ── 2. Confidentialité ─────────────────────────────────────────
  nouvellePage(ctx);
  bandeauInterieur(ctx, study);
  titreSection(
    ctx,
    study,
    "Avertissement et engagement de confidentialité",
    study.publicNumber
      ? `Dossier de vente n° ${study.publicNumber} : conditions d'accès aux informations confidentielles.`
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
    `${BRAND_NAME} accompagne courtiers et repreneurs dans la cession et l'acquisition de portefeuilles d'assurance. L'étude du portefeuille précède toute mise en ligne : ce n'est pas le cédant qui fixe le montant. Les dossiers certifiés sont ouverts, contrôlés et chiffrés avant d'être présentés.`,
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
  /*
   * L'anneau plutôt que l'histogramme.
   *
   * Un acquéreur cherche d'abord si le portefeuille tient sur une branche ou
   * s'il est réparti : c'est une question de proportions, et l'anneau la montre
   * d'un regard. Son centre porte la part de la branche principale, le chiffre
   * qui décide. Le détail chiffré se lit à droite, ligne à ligne.
   */
  const parts = study.byBranch.map((b, i) => ({ ...b, couleur: TRANCHE[i % TRANCHE.length]! }));
  const cx = MARGE + 92;
  const cy = ctx.y - 104;
  anneau(ctx, cx, cy, 78, 26, parts.map((p) => ({ share: p.share, couleur: p.couleur })));

  const dominante = parts[0];
  if (dominante) {
    const part = pct(dominante.share);
    ecrire(ctx, part, cx - largeur(ctx, part, 22, true) / 2, cy - 2, 22, { gras: true, couleur: NUIT });
    const sous = "branche principale";
    ecrire(ctx, sous, cx - largeur(ctx, sous, 7) / 2, cy - 16, 7, { couleur: GRIS });
  }

  // Le détail, à droite de l'anneau : une ligne par branche.
  const dx = MARGE + 196;
  const dw = LARGEUR - 196;
  let dy = ctx.y - 16;
  ecrire(ctx, "Part des commissions annuelles", dx, dy, 8, { gras: true, couleur: GRIS });
  dy -= 18;
  for (const b of parts.slice(0, 7)) {
    ctx.page.drawRectangle({ x: dx, y: dy - 1, width: 7, height: 7, color: b.couleur });
    ecrire(ctx, b.label, dx + 14, dy - 1, 9, { gras: true });
    const montant = euro(ctx, b.value);
    ecrire(ctx, montant, dx + dw - largeur(ctx, montant, 9, true), dy - 1, 9, { gras: true, couleur: NUIT });
    dy -= 12;
    const part = pct(b.share);
    ecrire(ctx, `${b.contracts} contrat${b.contracts > 1 ? "s" : ""}`, dx + 14, dy, 7.5, { couleur: GRIS });
    ecrire(ctx, part, dx + dw - largeur(ctx, part, 7.5), dy, 7.5, { couleur: GRIS });
    dy -= 7;
    barre(ctx, dx + 14, dy, dw - 14, b.share, b.couleur);
    dy -= 16;
  }
  ctx.y = Math.min(dy, cy - 100) - 8;

  if (study.topCarrier) {
    titreSection(ctx, study, "Les compagnies");
    paragraphe(
      ctx,
      study,
      study.carrierCount === 1
        ? `Portefeuille concentré à 100 % chez ${study.topCarrier.name}. Une seule compagnie porte donc l'ensemble du revenu.`
        : `${study.carrierCount} compagnies partenaires, la première à ${pct(study.topCarrier.share)} des commissions. Aucune ne fait basculer le portefeuille à elle seule.`,
    );
    ctx.y -= 6;
    const compagnies = study.byCarrier.slice(0, 6);
    for (const c of compagnies) {
      place(ctx, 26, study);
      ecrire(ctx, c.label, MARGE, ctx.y - 10, 9, { gras: true });
      const v = `${euro(ctx, c.value)}  ·  ${pct(c.share)}`;
      ecrire(ctx, v, MARGE + LARGEUR - largeur(ctx, v, 8.5), ctx.y - 10, 8.5, { couleur: GRIS });
      barre(ctx, MARGE, ctx.y - 19, LARGEUR, c.share, BLEU);
      ctx.y -= 26;
    }
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
  titreSection(ctx, study, "L'opportunité, le montant et les honoraires", "Synthèse de l'opportunité de portefeuille de courtage en assurance.");
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
  ecrire(ctx, `${VERIFIED_FEE_RANGE_LABEL} du montant`, feeX + 14, blocTop - 186, 8, { couleur: GRIS });
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
    "Le cadre et les prochaines étapes",
    `${BRAND_NAME} accompagne la cession de bout en bout, dans un cadre sécurisé et confidentiel.`,
  );
  const etapes = [
    { n: "01", t: "Audit et validation", d: "Vérification du périmètre net, des quittances et de l'antériorité des contrats." },
    { n: "02", t: "Mise en relation", d: "Présentation qualifiée de l'opportunité à des repreneurs ciblés, sous confidentialité." },
    { n: "03", t: "Le positionnement", d: "L'acquéreur verse son dépôt sur le montant arrêté, et la procédure de cession démarre." },
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
      ? `Pour échanger sur ce dossier : via la messagerie sécurisée, onglet Messages de l'annonce n° ${study.publicNumber}.`
      : "Prochaine étape : déposer le dossier pour étude, puis mise en ligne de l'annonce au prix déterminé.",
  );

  pied(ctx, study);
  return doc.save();
}
