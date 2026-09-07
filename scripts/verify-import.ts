/**
 * Parser checks for the portfolio import engine (no Vitest at this step).
 * Run: npx tsx scripts/verify-import.ts
 */
import iconv from "iconv-lite";
import * as XLSX from "xlsx";
import { applyMapping } from "../lib/import/apply-mapping";
import { detectNominativeColumns } from "../lib/import/pii";
import { parseUploadedTable } from "../lib/import/parse-file";
import { suggestColumnMapping, mappingIsComplete } from "../lib/import/mapping";
import { departmentFromPostalCode, parseFrenchDate, parseFrenchNumber, parseRiskType } from "../lib/import/values";

let failed = 0;

function assert(cond: unknown, label: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL  ${label}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

const csvUtf8 = Buffer.from(
  [
    "compagnie;branche;prime_ttc;taux_comm;comm_annuelle;effet;echeance;segment;cp;type_comm;ref_client",
    "AXA;Santé individuelle;1 234,56;12,5;154,32;01/03/2024;01/03/2025;Particulier;75011;Linéaire;C-001",
    "Allianz;Auto;800,00;10;80;15/06/2023;;TPE;20000;Précomptée;C-002",
  ].join("\r\n"),
  "utf8",
);

const table = parseUploadedTable(csvUtf8, "portefeuille.csv");
assert(table.delimiter === ";", "CSV détecte le point-virgule");
assert(table.encoding === "utf-8", "CSV UTF-8");
assert(table.headers.includes("compagnie") && table.rows.length === 2, "CSV en-têtes et 2 lignes");

const mapping = suggestColumnMapping(table.headers);
assert(mappingIsComplete(mapping) === null, "Mapping auto complet");
assert(mapping.carrier === "compagnie", "Synonyme compagnie");
assert(mapping.commissionRate === "taux_comm", "Synonyme taux_comm");
assert(mapping.clientKey === "ref_client", "Synonyme ref_client");

const mapped = applyMapping(table.headers, table.rows, mapping, "pf_test");
assert(mapped.errors.length === 0, `Aucune erreur mapping (${mapped.errors[0]?.message ?? ""})`);
assert(mapped.lines.length === 2, "2 lignes mappées");
assert(Number(mapped.lines[0]?.premium) === 1234.56, "Nombre FR 1 234,56");
assert(Number(mapped.lines[0]?.commissionRate) === 0.125, "Taux 12,5 % → 0.125");
assert(mapped.lines[1]?.renewalDate instanceof Date, "Échéance = effet + 12 mois si absente");
assert(mapped.lines[1]?.department === "2A", "CP 20000 → département 2A");
assert(mapped.lines[1]?.clientSegment === "PROFESSIONAL", "TPE → PROFESSIONAL");
assert(mapped.lines[1]?.commissionType === "ADVANCED", "Précomptée → ADVANCED");
assert(mapped.lines[0]?.clientKey !== "C-001" && (mapped.lines[0]?.clientKey as string).length === 24, "clientKey HMAC 24 hex");

const win = iconv.encode("compagnie;branche;cp;effet;prime_ttc;taux_comm\nAXA;Santé;75001;01/01/2024;100;10\n", "win1252");
const winTable = parseUploadedTable(Buffer.from(win), "ansi.csv");
assert(winTable.encoding === "windows-1252", "CSV Windows-1252");
assert(winTable.rows[0]?.[1] === "Santé", "Accents Windows-1252 conservés");

const piiCsv = Buffer.from("nom;email;cp\nDupont;jean@example.com;75001\nMartin;marie@example.com;69001\nDurand;paul@example.com;13001\n", "utf8");
const piiTable = parseUploadedTable(piiCsv, "pii.csv");
const findings = detectNominativeColumns(piiTable.headers, piiTable.rows);
assert(findings.some((f) => f.column.toLowerCase() === "nom"), "PII : colonne nom");
assert(findings.some((f) => f.column.toLowerCase() === "email"), "PII : colonne email");

const okHeaders = ["compagnie", "branche", "cp", "prime"];
assert(detectNominativeColumns(okHeaders, []).length === 0, "Pas de faux positif sur compagnie/cp");

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([
    ["compagnie", "branche", "prime_ttc", "taux_comm", "effet", "cp", "ref_client"],
    ["Generali", "Habitation", 980.5, 0.11, "12/01/2024", "69003", "X9"],
  ]),
  "Contrats",
);
const xlsxBuf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
const xlsxTable = parseUploadedTable(xlsxBuf, "export.xlsx");
assert(xlsxTable.delimiter === "xlsx", "XLSX reconnu");
const xlsxMap = suggestColumnMapping(xlsxTable.headers);
const xlsxMapped = applyMapping(xlsxTable.headers, xlsxTable.rows, xlsxMap, "pf_xlsx");
assert(xlsxMapped.lines.length === 1, "XLSX 1 ligne");
assert(xlsxMapped.lines[0]?.riskType === "HOME", "Habitation → HOME");
assert(xlsxMapped.lines[0]?.department === "69", "CP 69003 → 69");

assert(parseFrenchNumber("1.234,50") === 1234.5, "Nombre 1.234,50");
assert(parseFrenchDate("31/12/2023")?.toISOString().startsWith("2023-12-31"), "Date JJ/MM/AAAA");
assert(parseRiskType("RC Pro") === "PROFESSIONAL_LIABILITY", "RC Pro");
assert(departmentFromPostalCode("97100") === "971", "DOM 971");
assert(departmentFromPostalCode("20200") === "2B", "Corse 2B");

if (failed > 0) {
  console.error(`\n${failed} échec(s)`);
  process.exit(1);
}
console.log("\nTous les contrôles parseur/mapping/PII sont verts.");
