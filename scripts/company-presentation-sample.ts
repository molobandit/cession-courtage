import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { buildCompanyPresentationHtml } from "../lib/listing/company-presentation-html";
import type { CompanyPresentation } from "../lib/listing/company-presentation";

const out = process.argv[2] ?? "out";
mkdirSync(out, { recursive: true });
const dataUrl = (path: string, type: string) => `data:${type};base64,${readFileSync(path).toString("base64")}`;
const fonts = ([400, 500, 600, 700] as const).map((weight) => ({ weight, src: dataUrl(`public/fonts/ibm-plex-sans-latin-${weight}-normal.woff2`, "font/woff2") }));

const fiche: CompanyPresentation = {
  publicNumber: 10005,
  issuedAt: new Date("2026-10-04T10:00:00Z"),
  firm: { legalName: "Nord Assur Pro", legalForm: "EURL", siren: "890120005", address: "8 rue Faidherbe", postalCode: "59000", city: "Lille", region: "Hauts-de-France", foundedYear: 2017, headcount: 3, annualRevenue: 310000, distribution: "Agence", website: null, activityType: null },
  contact: { fullName: "Claire Dubois", jobTitle: "Gérante", email: "claire.dubois@nord-assur-pro.demo", phone: "+33 6 45 12 00 05", oriasNumber: "17001005" },
  portfolio: { label: "Portefeuille Nord, forte concentration AXA", annualCommissions: 11425, contractCount: 341, clientCount: 160, averageAgeMonths: 40, churnRate: 0.118, history: [{ label: "Exercice 2023", value: 10380 }, { label: "Exercice 2024", value: 10910 }, { label: "Exercice 2025", value: 11425 }] },
  sale: { askingPrice: 19995, multiple: 1.75, negotiable: true, motive: "Départ à la retraite", desiredDate: "2027-01", presentation: "Clientèle de particuliers et de petits professionnels de la métropole lilloise, suivie depuis l'agence de la rue Faidherbe. Relation de proximité, renouvellements gérés en interne, équipe autonome sur la gestion courante.", zone: "Nord", certified: true, partial: false },
  breakdowns: [
    { title: "Par branche", shares: [{ label: "Santé individuelle", value: 2515, share: 0.22, contracts: 70 }, { label: "Automobile", value: 1115, share: 0.098, contracts: 40 }, { label: "Santé senior", value: 1087, share: 0.095, contracts: 30 }, { label: "Habitation", value: 980, share: 0.086, contracts: 60 }, { label: "Prévoyance", value: 2950, share: 0.258, contracts: 70 }, { label: "Autres", value: 2778, share: 0.243, contracts: 71 }].sort((a, b) => b.value - a.value) },
    { title: "Par clientèle", shares: [{ label: "Particuliers", value: 8100, share: 0.709, contracts: 250 }, { label: "Professionnels", value: 3325, share: 0.291, contracts: 91 }] },
    { title: "Par compagnie", shares: [{ label: "AXA", value: 6400, share: 0.56, contracts: 190 }, { label: "Allianz", value: 2600, share: 0.228, contracts: 80 }, { label: "April", value: 2425, share: 0.212, contracts: 71 }] },
    { title: "Par zone", shares: [{ label: "Département 59", value: 9900, share: 0.866, contracts: 300 }, { label: "Département 62", value: 1525, share: 0.134, contracts: 41 }] },
  ],
  regulatory: [{ label: "Objet de la cession", value: "Cession du portefeuille" }, { label: "Catégories ORIAS", value: "COA" }, { label: "RC professionnelle", value: "MMA" }, { label: "Formation DDA", value: "Formations DDA à jour" }, { label: "LCB-FT", value: "Procédure écrite" }, { label: "Dépendance au cédant", value: "Faible" }, { label: "Logiciels métier", value: "Mon Courtier Pro" }],
  profile: [{ section: "Positionnement", rows: [{ label: "Branches travaillées", value: "Santé et prévoyance, Emprunteur, IARD particuliers" }, { label: "Clientèle cible", value: "Particuliers, TNS" }] }, { section: "Accompagnement", rows: [{ label: "Accompagnement proposé", value: "6 mois" }] }],
  documents: [{ label: "Statuts de la société", date: new Date("2026-09-01") }, { label: "Extrait Kbis", date: new Date("2026-09-01") }, { label: "Attestation ORIAS", date: new Date("2026-09-02") }],
};

const html = buildCompanyPresentationHtml(fiche, { images: { mark: dataUrl("public/brand/mark.png", "image/png") }, fonts, recipient: { label: "l'acquéreur A·12", date: new Date("2026-10-04") } });
writeFileSync(`${out}/Essai_presentation_cabinet.html`, html);
console.log("ok");
