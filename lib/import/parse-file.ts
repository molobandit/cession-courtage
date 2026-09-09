import Papa from "papaparse";
import * as XLSX from "xlsx";
import { decodeSpreadsheetText, detectCsvDelimiter } from "@/lib/import/decode";
import type { ParsedTable } from "@/lib/import/types";

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const d = value.getDate().toString().padStart(2, "0");
    const m = (value.getMonth() + 1).toString().padStart(2, "0");
    return `${d}/${m}/${value.getFullYear()}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).replace(".", ",");
  }
  return String(value).trim();
}

export function parseUploadedTable(buffer: Buffer, fileName: string): ParsedTable {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXlsx(buffer);
  }
  return parseCsv(buffer);
}

function parseCsv(buffer: Buffer): ParsedTable {
  const { text, encoding } = decodeSpreadsheetText(buffer);
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delimiter = detectCsvDelimiter(firstLine);
  const parsed = Papa.parse<string[]>(text, {
    delimiter,
    skipEmptyLines: "greedy",
    header: false,
  });
  const matrix = parsed.data
    .map((row) => row.map((cell) => stringifyCell(cell)))
    .filter((row) => row.some((cell) => cell.length > 0));
  if (matrix.length < 2) {
    throw new Error("Le fichier ne contient pas d'en-tête et de lignes de données.");
  }
  const headers = matrix[0]!.map(normalizeHeader);
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length) {
    throw new Error("Les en-têtes doivent être renseignés et uniques.");
  }
  return { headers, rows: matrix.slice(1), encoding, delimiter };
}

function parseXlsx(buffer: Buffer): ParsedTable {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Classeur Excel vide.");
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    dateNF: "dd/mm/yyyy",
  });
  const rows = matrix
    .map((row) => row.map((cell) => stringifyCell(cell)))
    .filter((row) => row.some((cell) => cell.length > 0));
  if (rows.length < 2) {
    throw new Error("La feuille Excel ne contient pas d'en-tête et de lignes de données.");
  }
  const headers = rows[0]!.map(normalizeHeader);
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length) {
    throw new Error("Les en-têtes doivent être renseignés et uniques.");
  }
  return { headers, rows: rows.slice(1), encoding: "utf-8", delimiter: "xlsx" };
}

export function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });
  return record;
}
