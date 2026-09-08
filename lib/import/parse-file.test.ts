import { describe, expect, it } from "vitest";
import iconv from "iconv-lite";
import { parseUploadedTable } from "@/lib/import/parse-file";
import { detectCsvDelimiter } from "@/lib/import/decode";
import { suggestColumnMapping } from "@/lib/import/mapping";

const HEADERS = ["Compagnie", "Branche", "Prime", "Commission", "Code postal", "Ref client"];

/**
 * La convention decimale suit le separateur : un export a virgule decimale
 * emploie le point-virgule (Excel francais), un export a virgule separatrice
 * emploie le point decimal (convention anglo-saxonne). Les deux ensemble sont
 * ambigus et aucun outil ne sait les lire.
 */
const ROW_FR = ["AXA", "Auto", "420,50", "50,46", "69003", "CLI-1"];
const ROW_EN = ["AXA", "Auto", "420.50", "50.46", "69003", "CLI-1"];

function csv(sep: string, row: string[]): Buffer {
  return Buffer.from(`${HEADERS.join(sep)}\n${row.join(sep)}\n`, "utf8");
}

describe("separateurs de colonnes", () => {
  it("reconnait le point-virgule, la tabulation et la barre verticale avec decimales francaises", () => {
    for (const sep of [";", "\t", "|"]) {
      const table = parseUploadedTable(csv(sep, ROW_FR), "export.csv");
      expect(table.headers).toEqual(HEADERS);
      expect(table.rows[0]).toEqual(ROW_FR);
    }
  });

  it("reconnait la virgule separatrice avec decimales anglo-saxonnes", () => {
    const table = parseUploadedTable(csv(",", ROW_EN), "export.csv");
    expect(table.headers).toEqual(HEADERS);
    expect(table.rows[0]).toEqual(ROW_EN);
  });

  it("lit une virgule decimale protegee par des guillemets", () => {
    const buffer = Buffer.from('Compagnie,Prime\nAXA,"420,50"\n', "utf8");
    const table = parseUploadedTable(buffer, "export.csv");
    expect(table.rows[0]).toEqual(["AXA", "420,50"]);
  });

  it("choisit le separateur le plus present hors guillemets", () => {
    expect(detectCsvDelimiter('a;b;c')).toBe(";");
    expect(detectCsvDelimiter("a\tb\tc")).toBe("\t");
    expect(detectCsvDelimiter("a|b|c")).toBe("|");
    // Une virgule a l'interieur d'un libelle entre guillemets ne doit pas compter.
    expect(detectCsvDelimiter('"Dupont, Ets";prime;commission')).toBe(";");
  });
});

describe("encodages", () => {
  it("lit un export Excel francais en Windows-1252", () => {
    const text = "Compagnie;Branche;Échéance\nAXA;Santé;01/01/2025\n";
    const table = parseUploadedTable(iconv.encode(text, "win1252"), "export.csv");
    expect(table.encoding).toBe("windows-1252");
    expect(table.headers).toContain("Échéance");
    expect(table.rows[0]).toContain("Santé");
  });

  it("lit l'UTF-8 avec marque d'ordre des octets", () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from("Compagnie;Prime\nAXA;100\n", "utf8");
    const table = parseUploadedTable(Buffer.concat([bom, body]), "export.csv");
    expect(table.headers[0]).toBe("Compagnie");
  });
});

describe("reconnaissance automatique des colonnes", () => {
  it("associe des intitules francais courants", () => {
    const mapping = suggestColumnMapping([
      "Compagnie", "Branche", "Prime annuelle", "Commission annuelle",
      "Date d'effet", "Échéance", "Code postal", "Référence client",
    ]);
    expect(mapping.carrier).toBe("Compagnie");
    expect(mapping.riskType).toBe("Branche");
    expect(mapping.annualCommission).toBe("Commission annuelle");
    expect(mapping.postalCode).toBe("Code postal");
  });

  it("associe des intitules anglais et abreges", () => {
    const mapping = suggestColumnMapping([
      "Carrier", "Product", "Premium", "Commission", "Zip", "Client ID",
    ]);
    expect(mapping.carrier).toBe("Carrier");
    expect(mapping.riskType).toBe("Product");
    expect(mapping.postalCode).toBe("Zip");
    expect(mapping.clientKey).toBe("Client ID");
  });

  it("n'associe jamais deux champs a la meme colonne", () => {
    const mapping = suggestColumnMapping(["Commission", "Commission", "Prime"]);
    const used = Object.values(mapping).filter(Boolean);
    expect(new Set(used).size).toBe(used.length);
  });
});
