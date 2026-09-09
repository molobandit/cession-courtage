import { rowToRecord } from "@/lib/import/parse-file";

const HEADER_PII = [
  { pattern: /\b(e-?mail|courriel|mail)\b/i, label: "adresse e-mail" },
  { pattern: /\b(pr[eé]nom|firstname|last.?name|surname|nom(_|\s)?(client|assur|souscript)|nom[_\s]?complet|raison\s*sociale)\b/i, label: "nom ou prénom" },
  { pattern: /^(nom|name)$/i, label: "nom" },
  { pattern: /\b(adresse|address|rue|street|voie|compl[eé]ment.*adresse)\b/i, label: "adresse" },
  { pattern: /\b(t[eé]l[eé]phone|mobile|portable|phone)\b/i, label: "téléphone" },
  { pattern: /\b(iban|nir|s[eé]cu|s[eé]curit[eé]\s*sociale)\b/i, label: "donnée d'identification" },
];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export type PiiFinding = {
  column: string;
  reason: string;
};

export function detectNominativeColumns(headers: string[], sampleRows: string[][]): PiiFinding[] {
  const findings: PiiFinding[] = [];
  for (const header of headers) {
    for (const rule of HEADER_PII) {
      if (rule.pattern.test(header)) {
        findings.push({
          column: header,
          reason: `La colonne « ${header} » ressemble à un ${rule.label} de client final.`,
        });
        break;
      }
    }
  }

  const records = sampleRows.slice(0, 40).map((row) => rowToRecord(headers, row));
  for (const header of headers) {
    if (findings.some((f) => f.column === header)) continue;
    let emails = 0;
    let nonEmpty = 0;
    for (const record of records) {
      const value = record[header] ?? "";
      if (!value) continue;
      nonEmpty += 1;
      if (EMAIL_RE.test(value)) emails += 1;
    }
    if (nonEmpty >= 3 && emails / nonEmpty >= 0.3) {
      findings.push({
        column: header,
        reason: `La colonne « ${header} » contient des adresses e-mail de clients.`,
      });
    }
  }
  return findings;
}

export function piiWarningText(findings: PiiFinding[]): string {
  const columns = [...new Set(findings.map((f) => f.column))].join(", ");
  return `Import refusé : le fichier contient des données nominatives (${columns}). Le grain le plus fin autorisé est le code postal. Retirez toute colonne de nom, d'e-mail, d'adresse ou de téléphone, puis réimportez un bordereau anonymisé.`;
}
