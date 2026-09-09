/**
 * Import par lots, sur la base D1 locale.
 *
 * Reproduit exactement la boucle du navigateur : tranches successives,
 * identifiants deterministes, rejeu d'une tranche. Verifie qu'un import de
 * grande taille arrive complet et sans doublon.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";
import { applyMapping } from "@/lib/import/apply-mapping";
import { parseUploadedTable } from "@/lib/import/parse-file";
import { suggestColumnMapping } from "@/lib/import/mapping";
import { IMPORT_BATCH_ROWS, LINE_CHUNK } from "@/lib/import/constants";
import { sumMoney } from "@/lib/format/money";

const ROWS = 3000;

function buildCsv(rows: number): Buffer {
  const header =
    "Compagnie;Branche;Prime annuelle;Taux de commission;Commission annuelle;Date d'effet;Échéance;Segment;Code postal;Type commission;Référence client";
  const lines = [header];
  for (let i = 0; i < rows; i += 1) {
    const prime = 120 + (i % 900);
    const comm = Math.round(prime * 0.12 * 100) / 100;
    lines.push(
      [
        ["AXA", "Allianz", "Generali"][i % 3],
        ["Auto", "Habitation", "Santé"][i % 3],
        `${prime},00`,
        "0,1200",
        `${comm.toFixed(2).replace(".", ",")}`,
        "01/01/2020",
        "01/01/2026",
        "Particulier",
        `${69000 + (i % 100)}`,
        "Linéaire",
        `CLI${i % 400}`,
      ].join(";"),
    );
  }
  return Buffer.from(lines.join("\n"), "utf8");
}

let portfolioId: string | null = null;

afterAll(async () => {
  if (portfolioId) {
    await prisma.contractLine.deleteMany({ where: { portfolioId } });
    await prisma.portfolio.delete({ where: { id: portfolioId } }).catch(() => undefined);
  }
  await disposePlatformProxy();
});

describe("import par lots", () => {
  it("insère toutes les lignes, par tranches, sans doublon même en rejouant", async () => {
    const buffer = buildCsv(ROWS);
    const table = parseUploadedTable(buffer, "portefeuille.csv");
    expect(table.rows).toHaveLength(ROWS);

    const mapping = suggestColumnMapping(table.headers);
    // Toutes les colonnes doivent être reconnues automatiquement.
    for (const field of [
      "carrier", "riskType", "premium", "commissionRate",
      "annualCommission", "effectiveDate", "postalCode", "clientKey",
    ] as const) {
      expect(mapping[field], `colonne ${field} non reconnue`).toBeTruthy();
    }

    const firm = await prisma.firm.findFirst({ select: { id: true } });
    const portfolio = await prisma.portfolio.create({
      data: {
        firmId: firm!.id,
        label: "TEST import par lots",
        contractCount: 0,
        clientCount: 0,
        annualCommissions: "0.00",
        averageAgeMonths: 0,
        churnRate12m: "0.10",
      },
    });
    portfolioId = portfolio.id;

    // Boucle identique à celle du navigateur.
    let processed = 0;
    let batches = 0;
    while (processed < table.rows.length) {
      const slice = table.rows.slice(processed, processed + IMPORT_BATCH_ROWS);
      const mapped = applyMapping(table.headers, slice, mapping, portfolio.id, processed);
      for (let i = 0; i < mapped.lines.length; i += LINE_CHUNK) {
        const chunk = mapped.lines.slice(i, i + LINE_CHUNK);
        await prisma.contractLine.deleteMany({
          where: { id: { in: chunk.map((l) => String(l.id)) } },
        });
        await prisma.contractLine.createMany({ data: chunk });
      }
      processed += slice.length;
      batches += 1;
    }

    expect(batches).toBe(Math.ceil(ROWS / IMPORT_BATCH_ROWS));
    expect(await prisma.contractLine.count({ where: { portfolioId: portfolio.id } })).toBe(ROWS);

    // Rejeu de la première tranche : le compte ne doit pas bouger.
    const first = table.rows.slice(0, IMPORT_BATCH_ROWS);
    const replay = applyMapping(table.headers, first, mapping, portfolio.id, 0);
    for (let i = 0; i < replay.lines.length; i += LINE_CHUNK) {
      const chunk = replay.lines.slice(i, i + LINE_CHUNK);
      await prisma.contractLine.deleteMany({
        where: { id: { in: chunk.map((l) => String(l.id)) } },
      });
      await prisma.contractLine.createMany({ data: chunk });
    }
    expect(await prisma.contractLine.count({ where: { portfolioId: portfolio.id } })).toBe(ROWS);

    // Agrégats de consolidation.
    const lines = await prisma.contractLine.findMany({
      where: { portfolioId: portfolio.id },
      select: { clientKey: true, annualCommission: true },
    });
    expect(new Set(lines.map((l) => l.clientKey)).size).toBe(400);
    const total = sumMoney(lines.map((l) => Number(l.annualCommission)));
    expect(total).toBeGreaterThan(0);
  });

  it("numérote les lignes en erreur selon leur rang réel dans le fichier", () => {
    const table = parseUploadedTable(buildCsv(600), "x.csv");
    const mapping = suggestColumnMapping(table.headers);
    // Une tranche démarrant à 500 doit signaler des numéros de ligne >= 502.
    const slice = table.rows.slice(500, 600).map((row) => {
      const copy = [...row];
      copy[2] = "";
      copy[4] = "";
      return copy;
    });
    const mapped = applyMapping(table.headers, slice, mapping, "pf_test", 500);
    expect(mapped.errors.length).toBeGreaterThan(0);
    expect(mapped.errors[0]!.row).toBeGreaterThanOrEqual(502);
  });
});
