import iconv from "iconv-lite";

export function decodeSpreadsheetText(buffer: Buffer): {
  text: string;
  encoding: "utf-8" | "windows-1252";
} {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.subarray(3).toString("utf8"), encoding: "utf-8" };
  }
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    if (!utf8.includes("\uFFFD")) {
      return { text: utf8, encoding: "utf-8" };
    }
  } catch {
    // Invalid UTF-8 — typical of Excel CSV exported as Windows-1252.
  }
  // Windows-1252 couvre les exports Excel francais. ISO-8859-15 ne s'en
  // distingue que sur quelques caracteres dont le symbole euro : le repli
  // Windows-1252 les rend correctement dans les deux cas.
  return { text: iconv.decode(buffer, "win1252"), encoding: "windows-1252" };
}

/**
 * Separateur de colonnes d'un fichier texte.
 *
 * Les exports de logiciels de courtage utilisent le point-virgule (Excel
 * francais), la virgule (export anglo-saxon), la tabulation (copier-coller
 * depuis un tableur) ou la barre verticale (exports de systemes anciens).
 * On retient celui qui apparait le plus souvent hors guillemets.
 */
export type CsvDelimiter = "," | ";" | "\t" | "|";

export function detectCsvDelimiter(headerLine: string): CsvDelimiter {
  const counts: Record<CsvDelimiter, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  let inQuotes = false;

  for (const ch of headerLine) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "," || ch === ";" || ch === "\t" || ch === "|") {
      counts[ch] += 1;
    }
  }

  let best: CsvDelimiter = ";";
  let bestCount = 0;
  for (const candidate of [";", ",", "\t", "|"] as CsvDelimiter[]) {
    if (counts[candidate] > bestCount) {
      best = candidate;
      bestCount = counts[candidate];
    }
  }
  // Aucun separateur trouve : une seule colonne, le point-virgule fait l'affaire.
  return bestCount === 0 ? ";" : best;
}
