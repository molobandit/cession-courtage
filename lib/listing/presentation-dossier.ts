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
import type { Share } from "@/lib/portfolio/analytics";

/**
 * Dossier de présentation d'un portefeuille, en pages web au format paysage.
 *
 * La mise en page suit le dossier de référence n° 10412 : neuf pages de
 * 960 x 540 points, chacune composée à positions fixes et remplie de haut en
 * bas. Le PDF s'obtient en imprimant ce HTML avec un navigateur.
 *
 * Aucun tiret, aucune barre ni aucun filet de séparation : les blocs se
 * distinguent par l'espace et par des fonds bleu pâle.
 */

export type PresentationDossierOptions = {
  certified: boolean;
  /** Montant de l'annonce, net vendeur. Par défaut, le milieu de la fourchette. */
  askingPrice?: number;
  /** Adresses (URL ou data URL) des images. */
  images: { mark: string; founder?: string | null };
  /** Police du site, intégrée au document : une adresse par graisse. */
  fonts?: { weight: 400 | 500 | 600 | 700; src: string }[];
  /** Destinataire de cette copie, inscrit en pied de chaque page. */
  recipient?: { label: string; date: Date } | null;
  /** Adresse de l'annonce sur le site, pour les liens du dossier. */
  listingUrl?: string | null;
};

/* Huit nuances du même bleu, écartées pour rester lisibles côte à côte. */
const COULEURS = ["#312e81", "#4f46e5", "#818cf8", "#c7d2fe", "#1d4ed8", "#60a5fa", "#a5b4fc", "#93c5fd"];
/** Tranches claires : texte foncé dessus. */
const CLAIRES = new Set([3, 6, 7]);
const NOMBRES = ["zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Retire tout tiret de ponctuation d'un texte venu des données. */
function sansTiret(s: string): string {
  return s.replace(/\s*[—–]\s*/g, ", ").replace(/\s+-\s+/g, ", ");
}

function t(s: string): string {
  return esc(sansTiret(s));
}

const NBSP = " ";

function nombre(v: number, decimales = 0): string {
  return v
    .toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    .replace(/\s/g, NBSP);
}

function euro(v: number): string {
  return `${nombre(Math.round(v))}${NBSP}€`;
}

function pct(share: number): string {
  const p = share * 100;
  return `${nombre(p, p > 0 && p < 1 ? 1 : 0)}${NBSP}%`;
}

function fois(v: number): string {
  return `${nombre(v, 2)} fois`;
}

function compte(n: number, singulier: string, pluriel: string, feminin = true): string {
  const mot = n === 1 ? singulier : pluriel;
  const chiffre = n <= 10 ? (n === 1 ? (feminin ? "une" : "un") : NOMBRES[n]!) : nombre(n);
  return `${chiffre} ${mot}`;
}

function dateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });
}

function minuscule(label: string): string {
  const premier = label.split(" ")[0] ?? "";
  if (premier.length > 1 && premier === premier.toUpperCase()) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function lettreCompagnie(i: number): string {
  return `Compagnie ${String.fromCharCode(65 + i)}`;
}

/** Compagnies anonymisées, comme dans le dossier de référence. */
function compagniesAnonymes(byCarrier: Share[]): Share[] {
  const visibles = byCarrier.slice(0, 4).map((s, i) => ({ ...s, label: lettreCompagnie(i) }));
  const reste = byCarrier.slice(4);
  if (reste.length === 0) return visibles;
  const value = reste.reduce((s, r) => s + r.value, 0);
  const share = reste.reduce((s, r) => s + r.share, 0);
  const contracts = reste.reduce((s, r) => s + r.contracts, 0);
  const label = reste.length === 1 ? lettreCompagnie(4) : `${NOMBRES[reste.length] ?? nombre(reste.length)} autres`.replace(/^./, (c) => c.toUpperCase());
  return [...visibles, { label, value, share, contracts }];
}

type Constat = { titre: string; texte: string };

/** Les quatre constats de « Ce que dit l'étude », tirés des chiffres. */
export function constatsEtude(study: ValuationStudy): Constat[] {
  const out: Constat[] = [];
  const precompteNul =
    study.listingPrecompte === false || (study.listingPrecompte == null && study.advancedCommissionShare <= 0);

  out.push({
    titre: "Un revenu récurrent",
    texte: precompteNul
      ? `${euro(study.annualCommissions)} de commissions annuelles nettes sur ${nombre(study.contractCount)} contrats actifs, sans prime exceptionnelle ni commission de première année dans la base.`
      : `${euro(study.annualCommissions)} de commissions annuelles nettes sur ${nombre(study.contractCount)} contrats actifs.`,
  });

  const nbCompagnies = compte(study.carrierCount, "compagnie partenaire", "compagnies partenaires");
  if (study.carrierCount <= 1) {
    out.push({
      titre: "Une compagnie unique",
      texte: "L'ensemble des commissions repose sur une seule convention. C'est le premier point examiné lors de l'audit.",
    });
  } else if (study.topCarrier && study.topCarrier.share < 0.5) {
    out.push({
      titre: "Un risque fournisseur réparti",
      texte: `${nbCompagnies.replace(/^./, (c) => c.toUpperCase())}, la première à ${pct(study.topCarrier.share)} des commissions. Aucune compagnie ne fait basculer le portefeuille à elle seule.`,
    });
  } else if (study.topCarrier) {
    out.push({
      titre: "Une compagnie principale",
      texte: `${nbCompagnies.replace(/^./, (c) => c.toUpperCase())}, la première à ${pct(study.topCarrier.share)} des commissions. Son poids est pris en compte dans la valorisation.`,
    });
  }

  if (study.averageAgeMonths >= 36) {
    out.push({
      titre: "Une clientèle installée",
      texte: `${nombre(study.averageAgeMonths)} mois d'ancienneté moyenne, soit un renouvellement qui se reconduit de lui-même.`,
    });
  } else if (study.averageAgeMonths > 0) {
    out.push({
      titre: "Une clientèle récente",
      texte: `${nombre(study.averageAgeMonths)} mois d'ancienneté moyenne. La tenue des contrats est vérifiée lors de l'audit.`,
    });
  }

  if (precompteNul) {
    out.push({
      titre: "Aucune reprise de précompte",
      texte: "Aucun contrat en période de reprise de précompte : pas de reprise de commissions par l'assureur en cas de résiliation après la cession.",
    });
  } else {
    out.push({
      titre: "Une part précomptée",
      texte: `${pct(study.advancedCommissionShare)} des commissions sont précomptées. Le risque de reprise est vérifié lors de l'audit.`,
    });
  }

  const dominante = study.byBranch[0];
  if (out.length < 4 && dominante) {
    out.push({
      titre: "Une branche principale",
      texte: `${dominante.label} porte ${pct(dominante.share)} des commissions, sur ${nombre(dominante.contracts)} contrats.`,
    });
  }
  return out.slice(0, 4);
}

function titreDossier(study: ValuationStudy): string {
  const branches = study.byBranch.filter((b) => b.share >= 0.05).map((b) => b.label);
  if (branches.length === 0) return study.headline;
  const liste = branches.slice(0, 3).map((b, i) => (i === 0 ? b : minuscule(b)));
  const texte = liste.length === 1 ? liste[0]! : `${liste.slice(0, -1).join(", ")} et ${liste[liste.length - 1]}`;
  return `Portefeuille ${minuscule(texte)}`;
}

function synthese(study: ValuationStudy): string {
  return `${nombre(study.contractCount)} contrats actifs, ${euro(study.annualCommissions)} de commissions récurrentes, ${compte(study.carrierCount, "compagnie partenaire", "compagnies partenaires")}.`;
}

// ── Pièces de mise en page ─────────────────────────────────────────

function anneau(parts: Share[], centre: string, sousCentre: string): string {
  const r = 78;
  const ep = 30;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const gap = parts.length > 1 ? 2.5 : 0;
  const arcs = parts
    .map((p, i) => {
      const long = Math.max(0, p.share * c - gap);
      const arc = `<circle r="${r}" cx="110" cy="110" fill="none" stroke="${COULEURS[i % COULEURS.length]}" stroke-width="${ep}" stroke-dasharray="${long} ${c - long}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"/>`;
      const mid = offset + (p.share * c) / 2;
      const angle = (mid / c) * 2 * Math.PI - Math.PI / 2;
      const lx = 110 + Math.cos(angle) * r;
      const ly = 110 + Math.sin(angle) * r;
      const label =
        p.share >= 0.06
          ? `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="600" fill="${CLAIRES.has(i % COULEURS.length) ? "#1e1b4b" : "#fff"}">${pct(p.share)}</text>`
          : "";
      offset += p.share * c;
      return arc + label;
    })
    .join("");
  return `<svg viewBox="0 0 220 220" width="250pt" height="250pt">${arcs}
    <text x="110" y="108" text-anchor="middle" font-size="19" font-weight="700" fill="#1e1b4b">${centre}</text>
    <text x="110" y="126" text-anchor="middle" font-size="8.5" fill="#64748b">${sousCentre}</text></svg>`;
}

function barre(parts: Share[]): string {
  return `<div class="barre">${parts
    .map((p, i) => `<span style="flex:${Math.max(p.share, 0.004)};background:${COULEURS[i % COULEURS.length]}"></span>`)
    .join("")}</div>`;
}

function legende(parts: Share[], format: (p: Share) => string): string {
  return `<div class="legende">${parts
    .map((p, i) => `<span><i style="background:${COULEURS[i % COULEURS.length]}"></i>${format(p)}</span>`)
    .join("")}</div>`;
}

function icone(nom: "depot" | "fonds" | "transfert" | "sequestre" | "etude" | "ligne" | "position" | "signature"): string {
  const traits: Record<string, string> = {
    depot: '<path d="M4 10h16v9H4z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    fonds: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
    transfert: '<path d="M6 4h9l3 3v13H6z"/><path d="M9 13l2 2 4-4"/>',
    sequestre: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    etude: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    ligne: '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/>',
    position: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    signature: '<path d="M4 18c3 0 4-8 7-8s1 6 4 6 3-3 5-3"/><path d="M4 21h16"/>',
  };
  return `<svg viewBox="0 0 24 24" width="13pt" height="13pt" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${traits[nom]}</svg>`;
}

const CSS = `
@page{size:960pt 540pt;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
b,strong{font-weight:600}
body{font-family:"IBM Plex Sans",system-ui,sans-serif;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:11.6pt;line-height:1.5}
.page{width:960pt;height:540pt;position:relative;overflow:hidden;page-break-after:always;padding:34pt 48pt 0}
.page:last-child{page-break-after:auto}
.bleu{background:linear-gradient(135deg,#4f46e5 0%,#3730a3 55%,#312e81 100%);color:#fff}
.n{font-size:9.8pt;font-weight:600;color:#4f46e5;letter-spacing:1pt}
h2{font-size:26.8pt;font-weight:600;color:#1e1b4b;letter-spacing:-.2pt;margin-top:4pt}
.intro{font-size:12.2pt;color:#64748b;margin-top:2pt}
.k{font-size:8.5pt;font-weight:600;letter-spacing:1.6pt;text-transform:uppercase;color:#4f46e5}
.pied{position:absolute;left:48pt;right:48pt;bottom:18pt;display:flex;justify-content:space-between;font-size:8.5pt;color:#94a3b8}
.bleu .pied{color:#c7d2fe}
.pale{background:#f4f6ff;border-radius:10pt}
.chiffre{font-size:25.6pt;font-weight:600;color:#1e1b4b;letter-spacing:-.4pt;line-height:1.1}
.etiquette{font-size:10.4pt;font-weight:600;color:#1e1b4b;margin-top:4pt}
.note{font-size:9.2pt;color:#64748b}
.barre{display:flex;gap:2pt;height:13pt;border-radius:4pt;overflow:hidden}
.barre span{display:block;height:100%}
.legende{display:flex;flex-wrap:wrap;gap:4pt 14pt;margin-top:7pt;font-size:9.8pt;color:#334155}
.legende i{display:inline-block;width:7pt;height:7pt;border-radius:2pt;margin-right:5pt;vertical-align:0}
.marque{display:flex;align-items:center;gap:9pt;font-weight:600;font-size:14pt}
.marque img{width:24pt;height:24pt;border-radius:6pt}
/* couverture */
.couv .tete{display:flex;justify-content:space-between;align-items:center}
.pastille{font-size:7.9pt;font-weight:600;letter-spacing:1.6pt;background:rgba(255,255,255,.14);border-radius:20pt;padding:4pt 10pt}
.filigrane{position:absolute;right:-70pt;top:150pt;width:300pt;height:300pt;opacity:.06;border-radius:60pt}
.couv .k{color:#c7d2fe;margin-top:62pt}
.couv h1{font-size:41.5pt;font-weight:600;letter-spacing:-.6pt;line-height:1.12;margin-top:8pt;max-width:640pt}
.couv .sous{font-size:14.6pt;color:#e0e7ff;margin-top:10pt;max-width:560pt}
.couv .kpis{display:flex;gap:40pt;margin-top:40pt;align-items:flex-end}
.couv .kpis b{display:block;font-size:29.3pt;font-weight:600;letter-spacing:-.4pt;line-height:1.1}
.couv .kpis span{font-size:9.8pt;color:#c7d2fe}
.couv .prix{background:rgba(255,255,255,.13);border-radius:10pt;padding:10pt 16pt}
.couv .meta{display:flex;gap:40pt;position:absolute;left:48pt;bottom:62pt}
.couv .meta small{display:block;font-size:7.9pt;letter-spacing:1.4pt;color:#a5b4fc;font-weight:600}
.couv .meta b{font-size:12.2pt;font-weight:600}
.couv .bas{position:absolute;left:48pt;bottom:20pt;font-size:9.2pt;color:#c7d2fe}
`;

export function buildPresentationDossierHtml(study: ValuationStudy, opts: PresentationDossierOptions): string {
  const range = roundedRange(study.lowValue, study.highValue);
  const prix = opts.askingPrice ?? study.midValue;
  const multiplePrix = study.annualCommissions > 0 ? prix / study.annualCommissions : 0;
  const numero = study.publicNumber ? String(study.publicNumber) : "à attribuer";
  const total = 8;
  const remis = opts.recipient ? `Remis à ${t(opts.recipient.label)} le ${dateFr(opts.recipient.date)}` : "";
  const pied = (n: number) =>
    `<div class="pied"><span>Document confidentiel · Dossier n° ${esc(numero)} · ${esc(BRAND_NAME)}</span><span>${remis}</span><span>${String(n).padStart(2, "0")}/${String(total).padStart(2, "0")}</span></div>`;
  const lien = (texte: string, ancre = "") =>
    opts.listingUrl ? `<a href="${esc(opts.listingUrl + ancre)}" style="color:inherit;text-decoration:underline;text-underline-offset:2pt">${texte}</a>` : texte;
  const entete = (n: number, titre: string, intro: string) =>
    `<div class="n">${String(n).padStart(2, "0")}</div><h2>${t(titre)}</h2><p class="intro">${t(intro)}</p>`;
  const marque = `<div class="marque"><img src="${esc(opts.images.mark)}" alt=""><span>${esc(BRAND_NAME)}</span></div>`;
  const titre = titreDossier(study);
  const branches = study.byBranch;
  const compagnies = compagniesAnonymes(study.byCarrier);
  const contratsParBranche = [...branches]
    .map((b) => ({ ...b, share: study.contractCount > 0 ? b.contracts / study.contractCount : 0 }));
  const constats = constatsEtude(study);
  const feeMin = successFeeFor(prix, VERIFIED_FEE_RATE_MIN);
  const feeMax = successFeeFor(prix, VERIFIED_FEE_RATE_MAX);
  const premiere = study.topCarrier ? pct(study.topCarrier.share) : "";
  const lectureRisque =
    study.carrierCount <= 1
      ? "Une seule compagnie porte l'ensemble des commissions. La convention de cette compagnie et ses conditions de transfert sont examinées en priorité lors de l'audit."
      : `Compagnie A porte ${premiere} des commissions, le reste se répartit sur ${compte(study.carrierCount - 1, "autre compagnie", "autres compagnies")}. ${
          (study.topCarrier?.share ?? 0) < 0.5
            ? "Le revenu ne repose donc pas sur une seule convention."
            : "Son poids est pris en compte dans la valorisation."
        }`;
  const amplitude =
    branches.length > 1
      ? `de ${euro(Math.min(...branches.map((b) => b.value)))} à ${euro(Math.max(...branches.map((b) => b.value)))}`
      : `une seule branche, ${euro(study.annualCommissions)}`;
  const precompteNul =
    study.listingPrecompte === false || (study.listingPrecompte == null && study.advancedCommissionShare <= 0);

  // ── Couverture ──
  const couverture = `
<section class="page bleu couv">
  <img class="filigrane" src="${esc(opts.images.mark)}" alt="">
  <div class="tete">${marque}<span class="pastille">CONFIDENTIEL</span></div>
  <div class="k">Dossier de présentation et d'étude</div>
  <h1>${t(titre)}</h1>
  <p class="sous">${t(synthese(study))}</p>
  <div class="kpis">
    <div><b>${euro(study.annualCommissions)}</b><span>commissions annuelles nettes</span></div>
    <div><b>${nombre(study.contractCount)}</b><span>contrats actifs</span></div>
    <div><b>${nombre(study.averageAgeMonths)} mois</b><span>d'ancienneté moyenne</span></div>
    <div class="prix"><b>${euro(prix)}</b><span>montant de l'annonce, net vendeur</span></div>
  </div>
  <div class="meta">
    <div><small>DOSSIER N°</small><b>${esc(numero)}</b></div>
    <div><small>LOCALISATION</small><b>${t(study.zone)}</b></div>
    <div><small>DONNÉES ARRÊTÉES AU</small><b>${dateFr(study.dataCutoff)}</b></div>
    <div><small>STATUT</small><b>${opts.certified ? "Portefeuille certifié" : "Portefeuille non certifié"}</b></div>
    <div><small>CONFIDENTIALITÉ</small><b>Document anonymisé</b></div>
  </div>
  <div class="bas">Présenté par ${esc(BRAND_NAME)}. La salle de marché des portefeuilles d'assurance.</div>
  ${remis ? `<div class="bas" style="left:auto;right:48pt">${remis}</div>` : ""}
</section>`;

  // ── 01 Confidentialité ──
  const engagements: [string, string][] = [
    ["Aucune communication", `Aucune communication, publique ou privée, portant sur ce portefeuille, sur votre intérêt pour son rachat ou sur le contenu de ce dossier ne peut être faite sans l'accord écrit préalable de ${BRAND_NAME} et du cédant.`],
    ["Non contact", "Vous acceptez de ne pas entrer en contact avec les compagnies partenaires, les collaborateurs ni les clients du cédant. Cet engagement s'étend à l'ensemble des employés, collaborateurs et conseils de votre organisation."],
    ["Confidentialité des informations", "Les informations de ce dossier, celles permettant d'identifier le cédant, ses opérations et son profil financier, ainsi que vos propres analyses, sont strictement confidentielles. Elles ne sont transmises qu'aux conseils ayant besoin d'en connaître, tenus des mêmes obligations."],
    ["Usage limité et restitution", "Ces éléments vous sont remis dans le seul but d'apprécier l'opportunité et de préparer votre positionnement. Toute reproduction ou conservation au delà de ce besoin est exclue : les documents sont détruits ou restitués sur simple demande, et au plus tard à la fin des discussions."],
    ["Absence de garantie", `${BRAND_NAME} ne pourra être tenue pour responsable de l'inexactitude éventuelle d'informations transmises tout au long du processus.`],
  ];
  const confidentialite = `
<section class="page">
  ${entete(1, "Avertissement et engagement de confidentialité", "Ce que vous acceptez en ouvrant ce dossier.")}
  <p style="margin-top:16pt;font-size:11.6pt;color:#334155;max-width:820pt">Ce dossier réunit les éléments communiqués par le cédant pour apprécier l'opportunité. Il ne le nomme pas. L'ensemble des informations qu'il contient est strictement confidentiel : elles vous sont remises pour ce seul usage et ne peuvent faire l'objet d'aucune communication, reproduction ou diffusion, sous quelque forme que ce soit. En accédant à ce dossier, vous acceptez les engagements suivants.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10pt;margin-top:16pt">
    ${engagements
      .map(
        ([titreE, texte], i) => `<div class="pale" style="padding:12pt 14pt;display:flex;gap:12pt${i === 4 ? ";grid-column:span 2" : ""}">
      <div style="flex:none;width:20pt;height:20pt;border-radius:50%;background:#4f46e5;color:#fff;font-weight:600;font-size:11pt;display:flex;align-items:center;justify-content:center">${i + 1}</div>
      <div><div style="font-weight:600;color:#1e1b4b;font-size:12.2pt">${t(titreE)}</div><div style="font-size:10.7pt;color:#475569;margin-top:2pt">${t(texte)}</div></div></div>`,
      )
      .join("")}
  </div>
  ${pied(1)}
</section>`;

  // ── 02 Qui sommes-nous ──
  const photo = opts.images.founder
    ? `<img src="${esc(opts.images.founder)}" alt="" style="width:176pt;height:176pt;border-radius:50%;object-fit:cover">`
    : `<div style="width:176pt;height:176pt;border-radius:50%;background:#4f46e5;color:#fff;font-size:48.8pt;font-weight:600;display:flex;align-items:center;justify-content:center">DB</div>`;
  const chiffresMaison: [string, string, string][] = [
    ["15 ans", "dans le courtage", "En France et en Suisse."],
    ["7 jours", "délai moyen de vente", "Constaté, jamais garanti."],
    ["50+", "points de contrôle", "Avant chaque certification."],
    ["100 %", "des fonds par un trust", "Libérés après vérification."],
  ];
  const quiSommesNous = `
<section class="page">
  ${entete(2, "Qui sommes-nous ?", "Une équipe issue du courtage, des deux côtés de la table.")}
  <div style="display:flex;gap:34pt;margin-top:24pt;align-items:center">
    ${photo}
    <div style="max-width:640pt">
      <div style="font-size:18.3pt;font-weight:600;color:#1e1b4b">Djesi Bayeye</div>
      <div style="font-size:11pt;color:#4f46e5;font-weight:600">Fondateur de ${esc(BRAND_NAME)}</div>
      <p style="margin-top:10pt;font-size:12.2pt;color:#334155">Djesi Bayeye compte 15 ans d'expérience dans le courtage en assurance et la gestion de patrimoine. Il a dirigé un cabinet en France et en Suisse, et accompagné des confrères des deux côtés de la table, à la vente comme à l'acquisition de portefeuilles.</p>
      <p style="margin-top:8pt;font-size:12.2pt;color:#334155">De cette expérience lui est venue une conviction : une opération bien préparée sert autant le cédant que l'acquéreur. C'est ce qu'il a bâti avec ${esc(BRAND_NAME)} : évaluer, analyser et certifier les portefeuilles, mettre en relation des vendeurs et des acquéreurs qualifiés, et sécuriser la transaction jusqu'à sa finalisation.</p>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12pt;position:absolute;left:48pt;right:48pt;bottom:52pt">
    ${chiffresMaison
      .map(([v, l, n]) => `<div class="pale" style="padding:16pt 16pt"><div class="chiffre" style="font-size:29.3pt">${esc(v)}</div><div class="etiquette">${esc(l)}</div><div class="note">${esc(n)}</div></div>`)
      .join("")}
  </div>
  ${pied(2)}
</section>`;

  // ── 03 L'essentiel ──
  const kpiEssentiel: [string, string, string][] = [
    [euro(study.annualCommissions), "Commissions par an", "nettes, récurrentes"],
    [nombre(study.contractCount), "Contrats actifs", `sur ${compte(study.carrierCount, "compagnie", "compagnies")}`],
    [`${nombre(study.averageAgeMonths)} mois`, "Ancienneté moyenne", "date d'effet des contrats"],
    [euro(study.monthlyCommissions), "Commissions par mois", "base annualisée divisée par 12"],
  ];
  const essentiel = `
<section class="page">
  ${entete(3, "L'essentiel du dossier", synthese(study))}
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12pt;margin-top:16pt">
    ${kpiEssentiel.map(([v, l, n]) => `<div class="pale" style="padding:13pt 15pt"><div class="chiffre">${v}</div><div class="etiquette">${esc(l)}</div><div class="note">${t(n)}</div></div>`).join("")}
  </div>
  <div class="k" style="margin-top:18pt">Ce que dit l'étude</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10pt 34pt;margin-top:8pt">
    ${constats.map((c) => `<p style="font-size:11.3pt;color:#334155"><b style="color:#1e1b4b;font-weight:600">${t(c.titre)} :</b> ${t(c.texte)}</p>`).join("")}
  </div>
  <div class="bleu" style="position:absolute;left:48pt;right:48pt;bottom:46pt;border-radius:12pt;padding:20pt 26pt;display:flex;align-items:center;gap:40pt">
    <div style="flex:none"><div class="k" style="color:#c7d2fe">Montant de l'annonce</div><div style="font-size:39pt;font-weight:600;letter-spacing:-.6pt;line-height:1.15">${euro(prix)}</div><div style="font-size:10.4pt;color:#c7d2fe">net vendeur</div></div>
    <div style="font-size:11.6pt;color:#e0e7ff">Valorisation retenue : <b style="color:#fff">de ${euro(range.low)} à ${euro(range.high)}</b>, soit de ${nombre(study.lowMultiple, 2)} à ${fois(study.highMultiple)} les commissions d'une année.<br>Le montant demandé représente ${fois(multiplePrix)} les commissions annuelles nettes du portefeuille.</div>
  </div>
  ${pied(3)}
</section>`;

  // ── 04 Anatomie ──
  const uneBranche = branches.length <= 1;
  const gauche = uneBranche
    ? `<div style="height:250pt;display:flex;flex-direction:column;align-items:center;justify-content:center" class="pale">
        <div style="font-size:58.6pt;font-weight:600;color:#4f46e5;line-height:1">100${NBSP}%</div>
        <div style="font-size:15.9pt;font-weight:600;color:#1e1b4b;margin-top:6pt">${t(branches[0]?.label ?? "Une seule branche")}</div>
        <div class="note" style="margin-top:2pt">${euro(study.annualCommissions)} de commissions par an</div></div>`
    : `<div style="display:flex;justify-content:center">${anneau(branches, euro(study.annualCommissions), "de commissions par an")}</div>`;
  const anatomie = `
<section class="page">
  ${entete(4, "Anatomie du portefeuille", `Ce qui compose le revenu : ${nombre(study.contractCount)} contrats actifs, ${compte(branches.length, "branche", "branches")}, ${compte(study.carrierCount, "compagnie partenaire", "compagnies partenaires")}.`)}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40pt;margin-top:18pt">
    <div>
      <div class="k">Commissions par branche</div>
      <div style="margin-top:8pt">${gauche}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4pt 14pt;margin-top:10pt;font-size:9.8pt;color:#334155">
        ${branches.map((b, i) => `<span><i style="display:inline-block;width:7pt;height:7pt;border-radius:2pt;margin-right:5pt;background:${COULEURS[i % COULEURS.length]}"></i>${t(b.label)} · ${euro(b.value)} · ${nombre(b.contracts)} contrats</span>`).join("")}
      </div>
    </div>
    <div>
      <div class="k">Poids des compagnies</div>
      <div style="margin-top:10pt">${barre(compagnies)}</div>
      ${legende(compagnies, (p) => `${t(p.label)} · ${pct(p.share)}`)}
      <div class="k" style="margin-top:34pt">Répartition des contrats</div>
      <div style="margin-top:10pt">${barre(contratsParBranche)}</div>
      ${legende(contratsParBranche, (p) => `${t(p.label)} · ${pct(p.share)}`)}
      <div class="pale" style="margin-top:34pt;padding:16pt 18pt">
        <div style="font-weight:600;color:#1e1b4b;font-size:11.6pt">Lecture du risque fournisseur</div>
        <div style="font-size:10.7pt;color:#475569;margin-top:3pt">${t(lectureRisque)}</div>
      </div>
    </div>
  </div>
  ${pied(4)}
</section>`;

  // ── 05 Structure des commissions ──
  const nbLignes = branches.length + 1;
  const hLigne = Math.max(24, Math.min(40, Math.floor((branches.length <= 3 ? 130 : 250) / nbLignes)));
  const qualite: [string, string][] = [
    ["Commission moyenne", `${nombre(study.averageCommissionPerContract, 2)}${NBSP}€ par contrat et par an`],
    ["Commissions par mois", `${euro(study.monthlyCommissions)}, base annualisée divisée par 12`],
    ["Amplitude par branche", amplitude],
    ["Ancienneté moyenne", `${nombre(study.averageAgeMonths)} mois`],
    ["Reprise de précompte", precompteNul ? "Aucun contrat en période de reprise de précompte." : `${pct(study.advancedCommissionShare)} des commissions précomptées, à vérifier.`],
  ];
  const parCompagnie =
    branches.length <= 3
      ? `<div style="display:grid;grid-template-columns:2fr .9fr 1.6fr .7fr;padding:0 12pt 6pt;margin-top:22pt" class="k">
        <span>Compagnie</span><span></span><span style="text-align:right">Commissions par an</span><span style="text-align:right">Part</span></div>
      ${compagnies
        .map(
          (c, i) => `<div style="display:grid;grid-template-columns:2fr .9fr 1.6fr .7fr;align-items:center;height:30pt;padding:0 12pt;border-radius:7pt;${i % 2 === 0 ? "background:#f4f6ff;" : ""}font-size:11.3pt">
        <span><i style="display:inline-block;width:8pt;height:8pt;border-radius:2pt;margin-right:8pt;background:${COULEURS[i % COULEURS.length]}"></i>${t(c.label)}</span>
        <span></span><span style="text-align:right">${euro(c.value)}</span><span style="text-align:right">${pct(c.share)}</span></div>`,
        )
        .join("")}`
      : "";
  const structure = `
<section class="page">
  ${entete(5, "Structure des commissions", "La base retenue pour la valorisation, et ce qui fait la solidité de ce revenu.")}
  <div style="display:grid;grid-template-columns:1.75fr 1fr;gap:34pt;margin-top:16pt">
    <div>
      <div style="display:grid;grid-template-columns:2fr .9fr 1.6fr .7fr;padding:0 12pt 6pt" class="k">
        <span>Branche</span><span style="text-align:right">Contrats</span><span style="text-align:right">Commissions par an</span><span style="text-align:right">Part</span></div>
      ${branches
        .map(
          (b, i) => `<div style="display:grid;grid-template-columns:2fr .9fr 1.6fr .7fr;align-items:center;height:${hLigne}pt;padding:0 12pt;border-radius:7pt;${i % 2 === 0 ? "background:#f4f6ff;" : ""}font-size:11.3pt">
        <span><i style="display:inline-block;width:8pt;height:8pt;border-radius:2pt;margin-right:8pt;background:${COULEURS[i % COULEURS.length]}"></i>${t(b.label)}</span>
        <span style="text-align:right">${nombre(b.contracts)}</span><span style="text-align:right">${euro(b.value)}</span><span style="text-align:right">${pct(b.share)}</span></div>`,
        )
        .join("")}
      <div style="display:grid;grid-template-columns:2fr .9fr 1.6fr .7fr;align-items:center;height:${hLigne}pt;padding:0 12pt;border-radius:7pt;background:#e0e7ff;font-weight:600;color:#1e1b4b;font-size:11.6pt;margin-top:4pt">
        <span>Total net annuel</span><span style="text-align:right">${nombre(study.contractCount)}</span><span style="text-align:right">${euro(study.annualCommissions)}</span><span style="text-align:right">100${NBSP}%</span></div>
      ${parCompagnie}
    </div>
    <div class="pale" style="padding:16pt 18pt">
      <div style="font-weight:600;color:#1e1b4b;font-size:12.8pt">Qualité du revenu</div>
      ${qualite.map(([l, v]) => `<div style="margin-top:11pt"><div class="note">${esc(l)}</div><div style="font-size:11.3pt;font-weight:600;color:#1e1b4b">${t(v)}</div></div>`).join("")}
    </div>
  </div>
  <p class="note" style="position:absolute;left:48pt;bottom:44pt;max-width:520pt;font-size:9.8pt">${t(`Export consolidé des contrats transmis par le cédant, retenu comme source de référence, sans aucune donnée nominative d'assuré (${nombre(study.contractCount)} contrats actifs). Données arrêtées au ${dateFr(study.dataCutoff)}.`)}</p>
  ${pied(5)}
</section>`;

  // ── 06 Valorisation ──
  const kpiValo: [string, string, string][] = [
    [euro(study.annualCommissions), "Commissions par an", "base de la valorisation"],
    [nombre(study.contractCount), "Contrats actifs", compte(branches.length, "branche", "branches")],
    [`${nombre(study.averageAgeMonths)} mois`, "Ancienneté moyenne", "date d'effet des contrats"],
    [fois(multiplePrix), "Le prix en années de commissions", "prix divisé par les commissions annuelles nettes"],
  ];
  const valorisation = `
<section class="page">
  ${entete(6, "Valorisation retenue", "Comment nous arrivons à cette fourchette, et ce qui la ferait bouger.")}
  <div class="bleu" style="margin-top:16pt;border-radius:12pt;padding:20pt 26pt;display:flex;align-items:center;gap:44pt">
    <div style="flex:none"><div class="k" style="color:#c7d2fe">Valorisation retenue</div><div style="font-size:31.7pt;font-weight:600;letter-spacing:-.4pt;line-height:1.2">de ${euro(range.low)} à ${euro(range.high)}</div></div>
    <div style="font-size:11.6pt;color:#e0e7ff">La fourchette représente de ${nombre(study.lowMultiple, 2)} à ${fois(study.highMultiple)} les commissions d'une année.<br>Montant de l'annonce : <b style="color:#fff">${euro(prix)} net vendeur</b>, soit ${fois(multiplePrix)} les commissions annuelles.</div>
  </div>
  <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:36pt;margin-top:20pt">
    <div>
      <div class="k">Méthode</div>
      <p style="margin-top:6pt;font-size:11.6pt;color:#334155">La valeur est obtenue en appliquant aux commissions annuelles nettes un multiple de marché, c'est à dire le nombre d'années de commissions auquel se négocient les portefeuilles comparables, puis en le corrigeant par notre cascade interne : répartition par branche, ancienneté des contrats, dépendance aux compagnies et accompagnement prévu par le cédant.</p>
      <p style="margin-top:6pt;font-size:11.6pt;color:#334155">Ce rapport définitif dépend de la qualité de l'audit, de l'attrition constatée et des conditions de reprise.</p>
      <p style="margin-top:6pt;font-size:11.6pt;color:#334155">Montant net vendeur, arrêté par notre équipe à l'issue de l'étude, à l'intérieur de la fourchette de valorisation.</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10pt">
      ${kpiValo.map(([v, l, n]) => `<div class="pale" style="padding:13pt 15pt"><div class="chiffre" style="font-size:23.2pt">${v}</div><div class="etiquette">${esc(l)}</div><div class="note">${t(n)}</div></div>`).join("")}
    </div>
  </div>
  ${pied(6)}
</section>`;

  // ── 07 Honoraires ──
  const garanties: [Parameters<typeof icone>[0], string, string][] = [
    ["depot", "Dépôt de l'acquéreur", "Dès que l'acquéreur se positionne, il verse un dépôt de 2,5 % du montant de l'annonce dans un trust. C'est ce dépôt qui lance la procédure de cession."],
    ["fonds", "Circulation des fonds", "La transaction passe par un trust. Les fonds ne sont libérés qu'après contrôle et vérification de l'ensemble des données."],
    ["transfert", "Transfert du portefeuille", "Le portefeuille est transmis une fois les contrats signés des deux parties et la totalité des fonds reçue par le trust."],
    ["sequestre", "Séquestre de conservation", "Le trust séquestre 20 % du montant du portefeuille. Cette part revient à l'acquéreur, au prorata, uniquement si la déperdition dépasse 10 %."],
  ];
  const carteHonoraires = opts.certified
    ? `<div class="k">Portefeuille certifié</div>
       <div style="font-size:36.6pt;font-weight:600;color:#1e1b4b;letter-spacing:-.5pt;margin-top:6pt">${esc(VERIFIED_FEE_RANGE_LABEL)}</div>
       <div style="font-size:11.6pt;color:#334155;margin-top:6pt">Soit de ${euro(Math.max(feeMin, SUCCESS_FEE_FLOOR_EUR))} à ${euro(Math.max(feeMax, SUCCESS_FEE_FLOOR_EUR))} HT pour ce dossier. Minimum ${euro(SUCCESS_FEE_FLOOR_EUR)} HT.</div>
       <div style="font-size:11.6pt;color:#334155;margin-top:14pt">Contrôle du dossier, cadre contractuel et sécurisation de la transaction.</div>
       <div style="font-size:11.6pt;font-weight:600;color:#1e1b4b;margin-top:4pt">Honoraires dus uniquement si la vente aboutit.</div>`
    : `<div class="k">Portefeuille non certifié</div>
       <div style="font-size:36.6pt;font-weight:600;color:#1e1b4b;letter-spacing:-.5pt;margin-top:6pt">${esc(SIMPLE_FEE_LABEL)}</div>
       <div style="font-size:11.6pt;color:#334155;margin-top:6pt">Mise en vente sans commission. Aucun honoraire si la vente n'aboutit pas.</div>
       <div style="font-size:11.6pt;color:#334155;margin-top:14pt">Annonce non certifiée. Les données du portefeuille ne sont pas vérifiées par ${esc(BRAND_NAME)}.</div>`;
  const honoraires = `
<section class="page">
  ${entete(7, "Honoraires et sécurisation", "Ce que coûte la cession, et par où passent les fonds.")}
  <div style="display:grid;grid-template-columns:1fr 1.25fr;gap:36pt;margin-top:18pt">
    <div class="pale" style="padding:26pt 26pt;height:330pt;display:flex;flex-direction:column;justify-content:center">${carteHonoraires}</div>
    <div>
      <div class="k">Une transaction sécurisée</div>
      ${garanties
        .map(
          ([ic, titreG, texte]) => `<div style="display:flex;gap:14pt;margin-top:14pt">
        <div style="flex:none;width:28pt;height:28pt;border-radius:8pt;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center">${icone(ic)}</div>
        <div><div style="font-weight:600;color:#1e1b4b;font-size:12pt">${esc(titreG)}</div><div style="font-size:10.9pt;color:#475569">${esc(texte)}</div></div></div>`,
        )
        .join("")}
    </div>
  </div>
  ${pied(7)}
</section>`;

  // ── 08 Cadre et étapes ──
  const etapes: [Parameters<typeof icone>[0], string, string][] = [
    ["etude", "L'étude", "Nous réalisons une étude du portefeuille afin de mettre en évidence ses différents éléments et caractéristiques."],
    ["ligne", "La mise en ligne", "Une fois la valeur déterminée, l'annonce est publiée avec le montant correspondant, sous un simple numéro de dossier."],
    ["position", "Le positionnement", "L'acquéreur verse 2,5 % dans un trust. La procédure de cession démarre et l'identité du cédant lui est révélée."],
    ["signature", "La signature", "Contrats contrôlés par nos avocats, signature des deux parties, fonds libérés par le trust, puis transfert des contrats."],
  ];
  const cadre = `
<section class="page bleu">
  <div class="n" style="color:#c7d2fe">08</div>
  <h2 style="color:#fff">Le cadre et les prochaines étapes</h2>
  <p class="intro" style="color:#c7d2fe">${esc(BRAND_NAME)} accompagne la cession de bout en bout, dans un cadre sécurisé et confidentiel.</p>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14pt;margin-top:22pt">
    ${etapes
      .map(
        ([ic, titreE, texte], i) => `<div style="background:rgba(255,255,255,.1);border-radius:12pt;padding:18pt 18pt;height:190pt">
      <div style="width:30pt;height:30pt;border-radius:50%;background:#fff;color:#4f46e5;display:flex;align-items:center;justify-content:center">${icone(ic)}</div>
      <div style="font-size:9.2pt;color:#c7d2fe;margin-top:12pt;font-weight:600">${String(i + 1).padStart(2, "0")}</div>
      <div style="font-size:13.4pt;font-weight:600">${esc(titreE)}</div>
      <div style="font-size:10.5pt;color:#e0e7ff;margin-top:4pt">${esc(texte)}</div></div>`,
      )
      .join("")}
  </div>
  <div style="font-size:15.9pt;font-weight:600;margin-top:20pt">Ce dossier vous intéresse ?</div>
  <p style="font-size:11.6pt;color:#e0e7ff;margin-top:3pt">Vous pouvez poser vos questions au cédant par ${lien("la messagerie sécurisée", "#messages")}, ou vous positionner directement. Le dépôt de 2,5 % lance la procédure et vous donne le nom du cabinet.</p>
  <div style="position:absolute;left:48pt;right:48pt;bottom:42pt;background:#fff;color:#1e1b4b;border-radius:12pt;padding:12pt 18pt;display:flex;align-items:center;gap:22pt">
    <div class="marque" style="color:#1e1b4b;font-size:12.8pt"><img src="${esc(opts.images.mark)}" alt=""><span>${esc(BRAND_NAME)}</span></div>
    <div style="font-size:11pt;color:#334155">Pour échanger sur ce dossier : par ${lien("la messagerie sécurisée", "#messages")}, onglet Messages de l'annonce n° ${esc(numero)}.</div>
    ${opts.listingUrl ? `<a href="${esc(opts.listingUrl)}" style="margin-left:auto;flex:none;background:#4f46e5;color:#fff;border-radius:20pt;padding:7pt 18pt;font-weight:600;font-size:11pt;text-decoration:none">Se positionner</a>` : ""}
  </div>
  ${pied(8)}
</section>`;

  const polices = (opts.fonts ?? [])
    .map((f) => `@font-face{font-family:"IBM Plex Sans";font-style:normal;font-weight:${f.weight};src:url("${f.src}") format("woff2")}`)
    .join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Dossier de présentation · n° ${esc(numero)}</title>
<style>${polices}${CSS}</style></head><body>
${couverture}${confidentialite}${quiSommesNous}${essentiel}${anatomie}${structure}${valorisation}${honoraires}${cadre}
</body></html>`;
}

/** Nom du fichier remis à l'acquéreur. */
export function presentationDossierFileName(publicNumber: number | null): string {
  return publicNumber ? `Dossier_${publicNumber}_La_bourse_du_portefeuille.pdf` : "Dossier_La_bourse_du_portefeuille.pdf";
}
