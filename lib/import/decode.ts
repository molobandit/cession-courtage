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
  return { text: iconv.decode(buffer, "win1252"), encoding: "windows-1252" };
}

export function detectCsvDelimiter(headerLine: string): "," | ";" {
  let commas = 0;
  let semis = 0;
  let inQuotes = false;
  for (const ch of headerLine) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === ",") commas += 1;
    if (ch === ";") semis += 1;
  }
  return semis > commas ? ";" : ",";
}
