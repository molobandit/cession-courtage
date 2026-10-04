/**
 * Dossiers d'essai : le n° 10412 de référence, puis un petit, un moyen et un
 * grand portefeuille. Écrit un fichier HTML par dossier dans le dossier donné.
 * Usage : npx tsx scripts/presentation-dossier-samples.ts <dossier-de-sortie>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPresentationDossierHtml } from "../lib/listing/presentation-dossier";
import type { ValuationStudy } from "../lib/listing/valuation-study-model";
import type { Share } from "../lib/portfolio/analytics";

const out = process.argv[2];
if (!out) {
  console.error("Usage: tsx scripts/presentation-dossier-samples.ts <dossier-de-sortie>");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const dataUrl = (path: string, type: string) => `data:${type};base64,${readFileSync(path).toString("base64")}`;
const images = {
  mark: dataUrl("public/brand/mark.png", "image/png"),
  founder: dataUrl("public/brand/djesi.jpg", "image/jpeg"),
};
const fonts = ([400, 500, 600, 700] as const).map((weight) => ({
  weight,
  src: dataUrl(`public/fonts/ibm-plex-sans-latin-${weight}-normal.woff2`, "font/woff2"),
}));

function parts(rows: [string, number, number][]): Share[] {
  const total = rows.reduce((s, r) => s + r[1], 0);
  return rows.map(([label, value, contracts]) => ({ label, value, contracts, share: value / total }));
}

function study(input: {
  publicNumber: number;
  zone: string;
  branches: [string, number, number][];
  carriers: [string, number, number][];
  age: number;
  low: number;
  high: number;
  price: number;
}): { s: ValuationStudy; price: number } {
  const byBranch = parts(input.branches);
  const byCarrier = parts(input.carriers);
  const annual = byBranch.reduce((s, b) => s + b.value, 0);
  const contracts = byBranch.reduce((s, b) => s + b.contracts, 0);
  return {
    price: input.price,
    s: {
      publicNumber: input.publicNumber,
      issuedAt: new Date("2026-09-22"),
      dataCutoff: new Date("2026-09-22"),
      zone: input.zone,
      headline: "",
      contractCount: contracts,
      annualCommissions: annual,
      monthlyCommissions: Math.round((annual / 12) * 100) / 100,
      carrierCount: byCarrier.length,
      topCarrier: byCarrier[0] ? { name: byCarrier[0].label, share: byCarrier[0].share } : null,
      byBranch,
      byCarrier,
      averageCommissionPerContract: Math.round((annual / contracts) * 100) / 100,
      averageAgeMonths: input.age,
      advancedCommissionShare: 0,
      listingPrecompte: false,
      lowValue: input.low,
      midValue: input.price,
      highValue: input.high,
      lowMultiple: Math.round((input.low / annual) * 100) / 100,
      highMultiple: Math.round((input.high / annual) * 100) / 100,
      keyPoints: [],
      sourceNote: "",
    },
  };
}

const samples: Record<string, { s: ValuationStudy; price: number }> = {
  "Essai_dossier_10412": study({
    publicNumber: 10412,
    zone: "Auvergne-Rhône-Alpes",
    branches: [["Santé", 96300, 512], ["Prévoyance", 51800, 268], ["IARD particuliers", 41200, 274], ["Emprunteur", 18900, 96], ["Professionnels", 6400, 37]],
    carriers: [["a", 81548, 0], ["b", 51504, 0], ["c", 36482, 0], ["d", 23606, 0], ["e", 12000, 0], ["f", 9460, 0]],
    age: 74, low: 375600, high: 439900, price: 410000,
  }),
  "Essai_petit_portefeuille": study({
    publicNumber: 10107,
    zone: "Hérault",
    branches: [["Santé individuelle", 9800, 58]],
    carriers: [["a", 6900, 0], ["b", 2900, 0]],
    age: 41, low: 15700, high: 19600, price: 17900,
  }),
  "Essai_moyen_portefeuille": study({
    publicNumber: 10146,
    zone: "Alpes-Maritimes",
    branches: [["Flotte automobile", 21400, 96], ["Protection juridique", 9100, 47], ["Multirisque professionnelle", 7680, 25]],
    carriers: [["a", 22900, 0], ["b", 9600, 0], ["c", 5680, 0]],
    age: 54, low: 98700, high: 112400, price: 106000,
  }),
  "Essai_grand_portefeuille": study({
    publicNumber: 10220,
    zone: "Île-de-France",
    branches: [["Santé collective", 248000, 610], ["Prévoyance collective", 162500, 402], ["Retraite", 88400, 215], ["IARD entreprises", 74300, 168], ["RC professionnelle", 31800, 97], ["Emprunteur", 19600, 88]],
    carriers: [["a", 172000, 0], ["b", 141000, 0], ["c", 102000, 0], ["d", 87000, 0], ["e", 58000, 0], ["f", 39000, 0], ["g", 25600, 0]],
    age: 92, low: 1180000, high: 1390000, price: 1290000,
  }),
};

for (const [name, { s, price }] of Object.entries(samples)) {
  const html = buildPresentationDossierHtml(s, { certified: name !== "Essai_petit_portefeuille", askingPrice: price,
    images,
    fonts,
    recipient: { label: "l'acquéreur A·12", date: new Date("2026-10-04") },
    listingUrl: `https://site.labourseduportefeuille.workers.dev/annonces/${s.publicNumber}`,
  });
  writeFileSync(join(out, `${name}.html`), html);
  console.log(name);
}
