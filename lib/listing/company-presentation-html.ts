import {
  COULEURS,
  CSS,
  NBSP,
  barre,
  dateFr,
  esc,
  euro,
  nombre,
  pct,
  t,
  type PresentationDossierOptions,
} from "@/lib/listing/presentation-dossier";
import type { CompanyPresentation } from "@/lib/listing/company-presentation";
import { BRAND_NAME } from "@/lib/site";

/**
 * Présentation nominative du cabinet cédant, au format du dossier de
 * présentation : pages paysage de 960 x 540 points, même charte, aucun tiret
 * ni filet. Remise à l'acquéreur une fois positionné.
 *
 * Une case vide n'est pas affichée : rien n'est inventé.
 */

export type CompanyPresentationOptions = Pick<PresentationDossierOptions, "images" | "fonts" | "recipient">;

type Fait = { label: string; value: string };

function faits(rows: (Fait | null | false)[]): Fait[] {
  return rows.filter((r): r is Fait => Boolean(r && r.value && r.value.trim()));
}

function tuile(f: Fait): string {
  return `<div class="pale" style="padding:10pt 16pt;display:flex;flex-direction:column;justify-content:center"><div class="note" style="font-size:9pt">${t(f.label)}</div><div style="font-size:12.5pt;font-weight:600;color:#1e1b4b;margin-top:1pt">${t(f.value)}</div></div>`;
}

function moisAnnee(v: string | null): string | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(v.trim());
  if (!m) return v;
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return `${mois[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

function resume(texte: string, max: number): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  return `${coupe.slice(0, coupe.lastIndexOf(" "))}…`;
}

/** Histogramme des commissions par exercice. */
function historique(points: { label: string; value: number }[]): string {
  const max = Math.max(...points.map((p) => p.value), 1);
  return `<div style="display:flex;align-items:flex-end;gap:22pt;height:150pt;margin-top:12pt">${points
    .map(
      (p, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
      <div style="font-size:10.4pt;font-weight:600;color:#1e1b4b;margin-bottom:5pt">${euro(p.value)}</div>
      <div style="width:100%;max-width:90pt;height:${Math.max(8, Math.round((p.value / max) * 110))}pt;border-radius:6pt 6pt 2pt 2pt;background:${i === points.length - 1 ? "#4f46e5" : "#a5b4fc"}"></div>
      <div class="note" style="margin-top:6pt;font-size:8.8pt">${t(p.label)}</div></div>`,
    )
    .join("")}</div>`;
}

export function buildCompanyPresentationHtml(p: CompanyPresentation, opts: CompanyPresentationOptions): string {
  const numero = String(p.publicNumber);
  const remis = opts.recipient ? `Remis à ${t(opts.recipient.label)} le ${dateFr(opts.recipient.date)}` : "";
  const marque = `<div class="marque"><span class="lg"></span><span>${esc(BRAND_NAME)}</span></div>`;
  const villeLigne = [p.firm.legalForm, p.firm.siren ? `SIREN ${p.firm.siren}` : "", [p.firm.postalCode, p.firm.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");

  // Pages de conformité et de profil : autant que nécessaire, 18 cases par page.
  const blocs: { section: string; rows: Fait[] }[] = [
    ...(p.regulatory.length ? [{ section: "Conformité et organisation", rows: p.regulatory }] : []),
    ...p.profile.map((s) => ({ section: s.section, rows: s.rows })),
  ];
  const cases = blocs.flatMap((b) => b.rows.map((r) => ({ ...r, section: b.section })));
  const PAR_PAGE = 18;
  const pagesProfil: (typeof cases)[] = [];
  for (let i = 0; i < cases.length; i += PAR_PAGE) pagesProfil.push(cases.slice(i, i + PAR_PAGE));
  const avecDocuments = p.documents.length > 0;
  const total = 3 + Math.max(pagesProfil.length, avecDocuments ? 1 : 0);

  const pied = (n: number) =>
    `<div class="pied"><span>Document confidentiel · Présentation du cabinet · Dossier n° ${esc(numero)}</span><span>${remis}</span><span>${String(n).padStart(2, "0")}/${String(total).padStart(2, "0")}</span></div>`;
  const entete = (n: number, titre: string, intro: string) =>
    `<div class="n">${String(n).padStart(2, "0")}</div><h2>${t(titre)}</h2><p class="intro">${t(intro)}</p>`;

  // ── Couverture ──
  const couverture = `
<section class="page bleu couv">
  <div class="filigrane lg"></div>
  <div class="tete">${marque}<span class="pastille">CONFIDENTIEL</span></div>
  <div class="k">Présentation du cabinet cédant</div>
  <h1>${t(p.firm.legalName)}</h1>
  <p class="sous">${t(villeLigne)}</p>
  <div class="kpis">
    <div><b>${euro(p.portfolio.annualCommissions)}</b><span>commissions annuelles</span></div>
    <div><b>${nombre(p.portfolio.contractCount)}</b><span>contrats, ${nombre(p.portfolio.clientCount)} clients</span></div>
    ${p.sale.multiple ? `<div><b>${nombre(p.sale.multiple, 2)} fois</b><span>les commissions annuelles</span></div>` : ""}
    <div class="prix"><b>${euro(p.sale.askingPrice)}</b><span>montant de l'annonce${p.sale.negotiable ? ", négociable" : ""}</span></div>
  </div>
  <div class="meta">
    <div><small>DOSSIER N°</small><b>${esc(numero)}</b></div>
    <div><small>ZONE</small><b>${t(p.sale.zone)}</b></div>
    <div><small>STATUT</small><b>${p.sale.certified ? "Portefeuille certifié" : "Portefeuille non certifié"}</b></div>
    <div><small>CESSION</small><b>${p.sale.partial ? "Partielle" : "Totale"}</b></div>
    <div><small>ÉTABLI LE</small><b>${dateFr(p.issuedAt)}</b></div>
  </div>
  <div class="bas">Présenté par ${esc(BRAND_NAME)}. Document nominatif, remis après le dépôt de positionnement.</div>
  ${remis ? `<div class="bas" style="left:auto;right:48pt">${remis}</div>` : ""}
</section>`;

  // ── 01 Identité ──
  const identite = faits([
    { label: "Raison sociale", value: p.firm.legalName },
    { label: "Forme juridique", value: p.firm.legalForm },
    { label: "SIREN", value: p.firm.siren },
    { label: "Siège", value: [p.firm.address, [p.firm.postalCode, p.firm.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") + (p.firm.region ? ` (${p.firm.region})` : "") },
    p.firm.foundedYear !== null && { label: "Création", value: String(p.firm.foundedYear) },
    p.firm.headcount !== null && { label: "Effectif", value: `${nombre(p.firm.headcount)} personne${p.firm.headcount > 1 ? "s" : ""}` },
    p.firm.annualRevenue !== null && { label: "Chiffre d'affaires", value: euro(p.firm.annualRevenue) },
    { label: "Mode de distribution", value: p.firm.distribution },
    p.firm.activityType ? { label: "Activité", value: p.firm.activityType } : null,
    p.firm.website ? { label: "Site internet", value: p.firm.website.replace(/^https?:\/\//, "") } : null,
  ]);
  const c = p.contact;
  const contact = c
    ? `<div class="bleu" style="border-radius:12pt;padding:22pt 24pt;height:100%">
        <div class="k" style="color:#c7d2fe">Votre interlocuteur</div>
        <div style="font-size:19pt;font-weight:600;margin-top:10pt">${t(c.fullName ?? "Représentant du cabinet")}</div>
        ${c.jobTitle ? `<div style="font-size:11pt;color:#c7d2fe">${t(c.jobTitle)}</div>` : ""}
        <div style="margin-top:22pt;font-size:11.5pt;line-height:1.9">
          <div><span style="color:#c7d2fe">E-mail</span><br><a href="mailto:${esc(c.email)}" style="color:#fff;font-weight:600;text-decoration:none">${esc(c.email)}</a></div>
          ${c.phone ? `<div style="margin-top:8pt"><span style="color:#c7d2fe">Téléphone</span><br><a href="tel:${esc(c.phone.replace(/\s/g, ""))}" style="color:#fff;font-weight:600;text-decoration:none">${esc(c.phone)}</a></div>` : ""}
          ${c.oriasNumber ? `<div style="margin-top:8pt"><span style="color:#c7d2fe">Immatriculation ORIAS</span><br><b style="font-weight:600">${esc(c.oriasNumber)}</b></div>` : ""}
        </div></div>`
    : "";
  const pageIdentite = `
<section class="page">
  ${entete(1, "Identité du cabinet", "La société qui cède, et la personne qui vous accompagne.")}
  <div style="display:grid;grid-template-columns:1.9fr 1fr;gap:22pt;margin-top:18pt;height:360pt">
    <div style="display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:10pt;height:100%">${identite.map(tuile).join("")}</div>
    <div>${contact}</div>
  </div>
  ${pied(1)}
</section>`;

  // ── 02 Portefeuille et cession ──
  const kpis: [string, string][] = [
    [euro(p.portfolio.annualCommissions), "Commissions par an"],
    [nombre(p.portfolio.contractCount), "Contrats"],
    [nombre(p.portfolio.clientCount), "Clients"],
    [`${nombre(p.portfolio.averageAgeMonths / 12, 1)} ans`, "Ancienneté moyenne"],
    [pct(p.portfolio.churnRate), "Résiliations sur 12 mois"],
  ];
  const cession = faits([
    { label: "Montant de l'annonce", value: `${euro(p.sale.askingPrice)}${p.sale.negotiable ? ", négociable" : ""}` },
    p.sale.multiple ? { label: "Multiple", value: `${nombre(p.sale.multiple, 2)} fois les commissions` } : null,
    { label: "Objet", value: p.sale.partial ? "Cession partielle du portefeuille" : "Cession totale du portefeuille" },
    p.sale.motive ? { label: "Motif de la cession", value: p.sale.motive } : null,
    p.sale.desiredDate ? { label: "Date souhaitée", value: moisAnnee(p.sale.desiredDate) ?? "" } : null,
    { label: "Zone", value: p.sale.zone },
  ]);
  const pagePortefeuille = `
<section class="page">
  ${entete(2, "Le portefeuille et la cession", p.portfolio.label)}
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10pt;margin-top:16pt">
    ${kpis.map(([v, l]) => `<div class="pale" style="padding:12pt 14pt"><div class="chiffre" style="font-size:20pt">${v}</div><div class="etiquette">${esc(l)}</div></div>`).join("")}
  </div>
  <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:26pt;margin-top:18pt">
    <div>
      ${
        p.portfolio.history.length > 0
          ? `<div class="k">Commissions par exercice</div>${historique(p.portfolio.history)}`
          : `<div class="k">Présentation du cabinet</div>`
      }
      ${p.sale.presentation ? `<p style="margin-top:${p.portfolio.history.length ? 14 : 8}pt;font-size:10.6pt;color:#334155">${t(resume(p.sale.presentation, p.portfolio.history.length ? 300 : 900))}</p>` : ""}
    </div>
    <div class="pale" style="padding:16pt 18pt">
      <div style="font-weight:600;color:#1e1b4b;font-size:12.5pt">La cession</div>
      ${cession.map((f) => `<div style="margin-top:9pt"><div class="note" style="font-size:8.6pt">${t(f.label)}</div><div style="font-size:11pt;font-weight:600;color:#1e1b4b">${t(f.value)}</div></div>`).join("")}
    </div>
  </div>
  ${pied(2)}
</section>`;

  // ── 03 Répartition ──
  const cartes = p.breakdowns
    .filter((b) => b.shares.length > 0)
    .slice(0, 4)
    .map(
      (b) => `<div class="pale" style="padding:14pt 16pt">
      <div class="k">${t(b.title)}</div>
      <div style="margin-top:9pt">${barre(b.shares)}</div>
      <div style="margin-top:8pt">${b.shares
        .slice(0, 6)
        .map(
          (s, i) => `<div style="display:flex;align-items:center;gap:8pt;font-size:9.8pt;color:#334155;margin-top:3pt">
          <i style="flex:none;width:8pt;height:8pt;border-radius:2pt;background:${COULEURS[i % COULEURS.length]}"></i>
          <span style="flex:1">${t(s.label)}</span><span style="width:70pt;text-align:right">${euro(s.value)}</span><b style="width:44pt;text-align:right;font-weight:600;color:#1e1b4b">${pct(s.share)}</b></div>`,
        )
        .join("")}</div></div>`,
    );
  const pageRepartition = `
<section class="page">
  ${entete(3, "Répartition des commissions", `Ce qui compose les ${euro(p.portfolio.annualCommissions)} de commissions annuelles, nominativement.`)}
  <div style="display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:186pt;gap:12pt;margin-top:16pt">${cartes.join("")}</div>
  ${pied(3)}
</section>`;

  // ── 04 et suivantes : conformité, profil, pièces ──
  const documents = avecDocuments
    ? `<div class="pale" style="padding:14pt 16pt">
        <div style="font-weight:600;color:#1e1b4b;font-size:11.5pt">Pièces déposées par le cabinet</div>
        ${p.documents.map((d) => `<div style="display:flex;justify-content:space-between;gap:10pt;font-size:9.8pt;color:#334155;margin-top:6pt"><span>${t(d.label)}</span><span class="note" style="font-size:9pt">${dateFr(d.date)}</span></div>`).join("")}
        <div class="note" style="margin-top:10pt;font-size:8.6pt">À consulter dans la salle de données de l'annonce.</div></div>`
    : "";
  const groupes = (rows: typeof cases) => {
    const parSection = new Map<string, Fait[]>();
    rows.forEach((r) => parSection.set(r.section, [...(parSection.get(r.section) ?? []), r]));
    return [...parSection.entries()]
      .map(
        ([section, rs]) => `<div style="break-inside:avoid;margin-bottom:12pt">
        <div class="k" style="margin-bottom:6pt">${t(section)}</div>
        ${rs.map((r) => `<div style="margin-top:6pt"><div class="note" style="font-size:8.6pt">${t(r.label)}</div><div style="font-size:10.2pt;font-weight:600;color:#1e1b4b">${t(r.value)}</div></div>`).join("")}
      </div>`,
      )
      .join("");
  };
  const pagesSuite = (pagesProfil.length ? pagesProfil : [[]]).map(
    (rows, i) => `
<section class="page">
  ${entete(4 + i, i === 0 ? "Organisation et conformité" : "Organisation et conformité, suite", "Ce que le cabinet a déclaré sur son fonctionnement, sa conformité et son profil.")}
  <div style="display:grid;grid-template-columns:${i === 0 && avecDocuments ? "2fr 1fr" : "1fr"};gap:22pt;margin-top:16pt">
    <div style="column-count:${i === 0 && avecDocuments ? 2 : 3};column-gap:26pt">${rows.length ? groupes(rows) : `<p class="note" style="font-size:10pt">Aucune information complémentaire déclarée.</p>`}</div>
    ${i === 0 ? documents : ""}
  </div>
  ${pied(4 + i)}
</section>`,
  );
  const suite = pagesProfil.length || avecDocuments ? pagesSuite.join("") : "";

  const polices = (opts.fonts ?? [])
    .map((f) => `@font-face{font-family:"IBM Plex Sans";font-style:normal;font-weight:${f.weight};src:url("${f.src}") format("woff2")}`)
    .join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Présentation du cabinet · n° ${esc(numero)}</title>
<style>${polices}${CSS}.lg{background-image:url("${esc(opts.images.mark)}")}</style></head><body>
${couverture}${pageIdentite}${pagePortefeuille}${pageRepartition}${suite}
</body></html>`.replace(/ /g, NBSP);
}

/** Nom du fichier de la présentation nominative. */
export function companyPresentationFileName(publicNumber: number): string {
  return `Presentation_cabinet_${publicNumber}_La_bourse_du_portefeuille.pdf`;
}
