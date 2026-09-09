import { parseUploadedTable } from "../../lib/import/parse-file";
import { detectNominativeColumns } from "../../lib/import/pii";

function makeCsv(rows: number): Buffer {
  const head = "Compagnie;Risque;Prime;Taux;Commission;Effet;Echeance;Segment;CodePostal;TypeCommission;RefClient";
  const lines = [head];
  for (let i = 0; i < rows; i += 1) {
    lines.push(`AXA;AUTO;${(100 + (i % 500))},50;0,12;${(12 + (i % 40))},30;01/01/2024;01/01/2025;Particulier;7500${i % 10};Lineaire;CLI${i}`);
  }
  return Buffer.from(lines.join("\n"), "utf8");
}

for (const rows of [1000, 5000, 20000, 50000]) {
  const buf = makeCsv(rows);
  const t0 = Date.now();
  const table = parseUploadedTable(buf, "bench.csv");
  const tParse = Date.now() - t0;
  const t1 = Date.now();
  detectNominativeColumns(table.headers, table.rows);
  const tPii = Date.now() - t1;
  const mb = (buf.length / 1024 / 1024).toFixed(2);
  console.log(
    `${String(rows).padStart(6)} lignes  ${String(mb).padStart(5)} Mo  analyse ${String(tParse).padStart(5)} ms  detection PII ${String(tPii).padStart(4)} ms`,
  );
}
