import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CompanyPresentation } from "@/lib/listing/company-presentation";

/**
 * Présentation détaillée du cabinet cédant, en PDF.
 *
 * Un vrai fichier, qui s'ouvre dans le lecteur du navigateur et se transmet
 * tel quel à un associé ou à un banquier : identité de la société, chiffres
 * du portefeuille, répartitions, conformité et pièces disponibles.
 *
 * Polices standard du format PDF : aucun fichier de police à embarquer, mais
 * un jeu de caractères limité. Tout texte passe par `lisible`, qui remplace ce
 * que la police ne sait pas écrire au lieu de faire échouer le document.
 */

const A4 = { w: 595.28, h: 841.89 };
const MARGE = 48;
const LARGEUR = A4.w - MARGE * 2;

const BLEU = rgb(0.145, 0.388, 0.922);
const BLEU_FONCE = rgb(0.114, 0.306, 0.847);
const BLEU_PALE = rgb(0.937, 0.965, 1);
const ENCRE = rgb(0.067, 0.094, 0.153);
const GRIS = rgb(0.373, 0.42, 0.478);
const TRAIT = rgb(0.898, 0.906, 0.922);
const FOND_BARRE = rgb(0.953, 0.957, 0.965);
const BLANC = rgb(1, 1, 1);

const euro = (v: number) => `${Math.round(v).toLocaleString("fr-FR")} €`;
const pct = (v: number, d = 1) => `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d })} %`;
const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  charset: Set<number>;
  pages: PDFPage[];
  numero: number;
};

function lisible(ctx: Ctx, texte: string): string {
  const remplace = texte
    .replace(/[   ]/g, " ")
    .replace(/[‐-‒]/g, "-")
    .replace(/…/g, "...")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
  let out = "";
  for (const ch of remplace) out += ctx.charset.has(ch.codePointAt(0)!) ? ch : "?";
  return out;
}

function largeur(ctx: Ctx, texte: string, taille: number, gras = false) {
  return (gras ? ctx.bold : ctx.regular).widthOfTextAtSize(lisible(ctx, texte), taille);
}

function ecrire(ctx: Ctx, texte: string, x: number, y: number, taille: number, opts: { gras?: boolean; couleur?: ReturnType<typeof rgb> } = {}) {
  ctx.page.drawText(lisible(ctx, texte), { x, y, size: taille, font: opts.gras ? ctx.bold : ctx.regular, color: opts.couleur ?? ENCRE });
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

function nouvellePage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([A4.w, A4.h]);
  ctx.pages.push(ctx.page);
  ctx.y = A4.h - MARGE;
  ecrire(ctx, `Présentation du cabinet · Dossier n° ${ctx.numero}`, MARGE, A4.h - 30, 8, { couleur: GRIS });
  ctx.y = A4.h - MARGE - 6;
}

function place(ctx: Ctx, hauteur: number) {
  if (ctx.y - hauteur < MARGE + 30) nouvellePage(ctx);
}

/** `suite` : hauteur du premier bloc qui suit, pour ne jamais laisser un titre seul en bas de page. */
function titreSection(ctx: Ctx, titre: string, suite = 40) {
  place(ctx, 34 + suite);
  ctx.y -= 18;
  ctx.page.drawRectangle({ x: MARGE, y: ctx.y - 3, width: 3, height: 15, color: BLEU });
  ecrire(ctx, titre, MARGE + 10, ctx.y, 13, { gras: true });
  ctx.y -= 16;
}

function lignesCleValeur(ctx: Ctx, rangs: { label: string; value: string }[]) {
  const colLabel = 170;
  for (const r of rangs) {
    const valeurs = couper(ctx, r.value, 10, LARGEUR - colLabel);
    const h = Math.max(1, valeurs.length) * 13 + 7;
    place(ctx, h);
    ecrire(ctx, r.label, MARGE, ctx.y - 11, 9.5, { couleur: GRIS });
    valeurs.forEach((v, i) => ecrire(ctx, v, MARGE + colLabel, ctx.y - 11 - i * 13, 10, { gras: i === 0 }));
    ctx.y -= h;
    ctx.page.drawLine({ start: { x: MARGE, y: ctx.y + 2 }, end: { x: A4.w - MARGE, y: ctx.y + 2 }, thickness: 0.5, color: TRAIT });
  }
}

function paragraphe(ctx: Ctx, texte: string, taille = 10) {
  for (const l of couper(ctx, texte, taille, LARGEUR)) {
    place(ctx, 15);
    ecrire(ctx, l, MARGE, ctx.y - 11, taille);
    ctx.y -= 14.5;
  }
}

function cartesChiffres(ctx: Ctx, cartes: { label: string; value: string; note?: string }[]) {
  const ecart = 10;
  const w = (LARGEUR - ecart * (cartes.length - 1)) / cartes.length;
  const h = 62;
  place(ctx, h + 8);
  cartes.forEach((c, i) => {
    const x = MARGE + i * (w + ecart);
    ctx.page.drawRectangle({ x, y: ctx.y - h, width: w, height: h, color: BLEU_PALE, borderColor: rgb(0.749, 0.859, 0.996), borderWidth: 0.8 });
    ecrire(ctx, c.label.toUpperCase(), x + 10, ctx.y - 16, 7, { gras: true, couleur: BLEU_FONCE });
    ecrire(ctx, c.value, x + 10, ctx.y - 37, 15, { gras: true });
    if (c.note) ecrire(ctx, c.note, x + 10, ctx.y - 52, 7.5, { couleur: GRIS });
  });
  ctx.y -= h + 8;
}

function barres(ctx: Ctx, titre: string, parts: { label: string; value: number; share: number }[]) {
  if (parts.length === 0) return;
  place(ctx, 22 + parts.length * 17);
  ecrire(ctx, titre, MARGE, ctx.y - 12, 10.5, { gras: true });
  ctx.y -= 20;
  const colLabel = 150;
  const colValeurs = 110;
  const zone = LARGEUR - colLabel - colValeurs - 10;
  const max = Math.max(...parts.map((p) => p.share), 0.0001);
  for (const p of parts) {
    const etiquette = couper(ctx, p.label, 9, colLabel - 8)[0] ?? p.label;
    ecrire(ctx, etiquette, MARGE, ctx.y - 10, 9);
    ctx.page.drawRectangle({ x: MARGE + colLabel, y: ctx.y - 11, width: zone, height: 7, color: FOND_BARRE });
    ctx.page.drawRectangle({
      x: MARGE + colLabel,
      y: ctx.y - 11,
      width: Math.max(2, (p.share / max) * zone),
      height: 7,
      color: p.label.startsWith("Autres") ? rgb(0.58, 0.64, 0.72) : BLEU,
    });
    const txt = `${pct(p.share)} · ${euro(p.value)}`;
    ecrire(ctx, txt, A4.w - MARGE - largeur(ctx, txt, 9), ctx.y - 10, 9);
    ctx.y -= 17;
  }
  ctx.y -= 6;
}

export async function renderCompanyPresentationPdf(p: CompanyPresentation): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Présentation du cabinet · dossier n° ${p.publicNumber}`);
  doc.setAuthor("La bourse du portefeuille");
  doc.setSubject(`Présentation de ${p.firm.legalName}`);
  doc.setCreationDate(p.issuedAt);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4.w, A4.h]);
  const ctx: Ctx = {
    doc,
    page,
    y: A4.h,
    regular,
    bold,
    charset: new Set(regular.getCharacterSet()),
    pages: [page],
    numero: p.publicNumber,
  };

  // En-tête bleu de la première page.
  const hauteurBandeau = 150;
  ctx.page.drawRectangle({ x: 0, y: A4.h - hauteurBandeau, width: A4.w, height: hauteurBandeau, color: BLEU });
  ctx.page.drawRectangle({ x: 0, y: A4.h - hauteurBandeau, width: A4.w, height: 4, color: BLEU_FONCE });
  ecrire(ctx, "LA BOURSE DU PORTEFEUILLE", MARGE, A4.h - 38, 8.5, { gras: true, couleur: BLANC });
  ecrire(ctx, `Dossier n° ${p.publicNumber} · Document confidentiel`, A4.w - MARGE - largeur(ctx, `Dossier n° ${p.publicNumber} · Document confidentiel`, 8.5), A4.h - 38, 8.5, { couleur: BLANC });
  ecrire(ctx, "Présentation du cabinet", MARGE, A4.h - 72, 12, { couleur: BLANC });
  const nom = couper(ctx, p.firm.legalName, 24, LARGEUR, true);
  nom.slice(0, 2).forEach((l, i) => ecrire(ctx, l, MARGE, A4.h - 102 - i * 28, 24, { gras: true, couleur: BLANC }));
  const sousTitre = [p.firm.legalForm, `SIREN ${p.firm.siren}`, `${p.firm.postalCode} ${p.firm.city}`].filter(Boolean).join(" · ");
  ecrire(ctx, sousTitre, MARGE, A4.h - hauteurBandeau + 16, 10, { couleur: BLANC });
  ctx.y = A4.h - hauteurBandeau - 10;

  titreSection(ctx, "Chiffres clés", 70);
  cartesChiffres(ctx, [
    { label: "Commissions / an", value: euro(p.portfolio.annualCommissions) },
    { label: "Contrats", value: p.portfolio.contractCount.toLocaleString("fr-FR"), note: `${p.portfolio.clientCount.toLocaleString("fr-FR")} clients` },
    { label: "Prix", value: euro(p.sale.askingPrice), note: p.sale.negotiable ? "Négociable" : "Ferme" },
    { label: "Multiple", value: p.sale.multiple ? `x${p.sale.multiple.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}` : "-", note: "Prix / commissions" },
  ]);

  titreSection(ctx, "Identité de la société");
  const identite: { label: string; value: string }[] = [
    { label: "Raison sociale", value: p.firm.legalName },
    { label: "Forme juridique", value: p.firm.legalForm },
    { label: "SIREN", value: p.firm.siren },
    { label: "Siège", value: `${p.firm.address}, ${p.firm.postalCode} ${p.firm.city} (${p.firm.region})` },
  ];
  if (p.firm.foundedYear) identite.push({ label: "Création", value: String(p.firm.foundedYear) });
  if (p.firm.headcount !== null) identite.push({ label: "Effectif", value: `${p.firm.headcount} personne${p.firm.headcount > 1 ? "s" : ""}` });
  if (p.firm.annualRevenue !== null) identite.push({ label: "Chiffre d'affaires", value: euro(p.firm.annualRevenue) });
  identite.push({ label: "Mode de distribution", value: p.firm.distribution });
  if (p.firm.activityType) identite.push({ label: "Activité", value: p.firm.activityType });
  if (p.firm.website) identite.push({ label: "Site internet", value: p.firm.website });
  if (p.contact) {
    if (p.contact.oriasNumber) identite.push({ label: "Immatriculation ORIAS", value: p.contact.oriasNumber });
    identite.push({
      label: "Représentant",
      value: [p.contact.fullName, p.contact.jobTitle].filter(Boolean).join(", ") || "-",
    });
    identite.push({ label: "Contact", value: [p.contact.email, p.contact.phone].filter(Boolean).join(" · ") });
  }
  if (p.sale.certified) identite.push({ label: "Certification", value: "Portefeuille certifié par la plateforme" });
  lignesCleValeur(ctx, identite);

  if (p.sale.presentation?.trim()) {
    titreSection(ctx, "Présentation");
    paragraphe(ctx, p.sale.presentation.trim());
  }

  titreSection(ctx, "Portefeuille et cession");
  const portefeuille: { label: string; value: string }[] = [
    { label: "Portefeuille", value: p.portfolio.label + (p.sale.partial ? " (cession partielle)" : "") },
    { label: "Zone", value: p.sale.zone },
    { label: "Ancienneté moyenne", value: `${Math.round(p.portfolio.averageAgeMonths / 12 * 10) / 10} ans`.replace(".", ",") },
    { label: "Résiliations sur 12 mois", value: pct(p.portfolio.churnRate) },
    ...p.portfolio.history.map((h) => ({ label: `Commissions ${h.label.toLowerCase()}`, value: euro(h.value) })),
  ];
  if (p.sale.motive) portefeuille.push({ label: "Motif de la cession", value: p.sale.motive });
  if (p.sale.desiredDate) portefeuille.push({ label: "Date de cession souhaitée", value: p.sale.desiredDate });
  lignesCleValeur(ctx, portefeuille);

  titreSection(ctx, "Répartition des commissions", 22 + (p.breakdowns[0]?.shares.length ?? 0) * 17);
  for (const b of p.breakdowns) barres(ctx, b.title, b.shares);

  for (const volet of p.profile) {
    titreSection(ctx, `Profil du cabinet · ${volet.section}`, Math.min(volet.rows.length, 3) * 20);
    lignesCleValeur(ctx, volet.rows);
  }

  if (p.regulatory.length) {
    titreSection(ctx, "Conformité et organisation");
    lignesCleValeur(ctx, p.regulatory);
  }

  titreSection(ctx, "Pièces du cabinet disponibles");
  if (p.documents.length) {
    lignesCleValeur(ctx, p.documents.map((d) => ({ label: dateFr(d.date), value: d.label })));
  } else {
    paragraphe(ctx, "Aucune pièce déposée pour le moment.");
  }

  // Pied de page sur chaque page.
  const total = ctx.pages.length;
  ctx.pages.forEach((pg, i) => {
    ctx.page = pg;
    pg.drawLine({ start: { x: MARGE, y: 34 }, end: { x: A4.w - MARGE, y: 34 }, thickness: 0.5, color: TRAIT });
    ecrire(ctx, `Établi le ${dateFr(p.issuedAt)} à partir des informations déclarées par le cédant. Confidentiel : engagement de confidentialité.`, MARGE, 22, 7, { couleur: GRIS });
    const n = `${i + 1} / ${total}`;
    ecrire(ctx, n, A4.w - MARGE - largeur(ctx, n, 7), 22, 7, { couleur: GRIS });
  });

  return doc.save();
}
