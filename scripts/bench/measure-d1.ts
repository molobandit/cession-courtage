import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getPlatformProxy } from "wrangler";

type D1 = ConstructorParameters<typeof PrismaD1>[0];

async function main() {
  const proxy = await getPlatformProxy<{ DB: D1 }>();
  const prisma = new PrismaClient({ adapter: new PrismaD1(proxy.env.DB) });

  const firm = await prisma.firm.findFirst({ select: { id: true } });
  const pf = await prisma.portfolio.create({
    data: {
      firmId: firm!.id, label: "BENCH", contractCount: 0, clientCount: 0,
      annualCommissions: "0", averageAgeMonths: 0, churnRate12m: "0.1",
    },
  });

  const line = (i: number) => ({
    portfolioId: pf.id, carrier: "AXA", riskType: "AUTO" as const,
    premium: "100", commissionRate: "0.1", annualCommission: "10",
    effectiveDate: new Date("2024-01-01"), renewalDate: new Date("2025-01-01"),
    clientSegment: "INDIVIDUAL" as const, postalCode: "75001",
    commissionType: "LINEAR" as const, clientKey: `k${i}`, department: "75",
  });

  for (const chunk of [6, 7, 10, 25, 50]) {
    const rows = Array.from({ length: 300 }, (_, i) => line(i));
    const t0 = Date.now();
    try {
      for (let i = 0; i < rows.length; i += chunk) {
        await prisma.contractLine.createMany({ data: rows.slice(i, i + chunk) });
      }
      const ms = Date.now() - t0;
      const perLine = ms / rows.length;
      console.log(`chunk=${String(chunk).padStart(2)}  300 lignes en ${String(ms).padStart(5)} ms  (${perLine.toFixed(2)} ms/ligne)  -> 50 000 lignes ~ ${Math.round(perLine * 50000 / 1000)} s`);
    } catch (e) {
      console.log(`chunk=${String(chunk).padStart(2)}  ECHEC : ${(e as Error).message.split("\n")[0].slice(0, 90)}`);
    }
    await prisma.contractLine.deleteMany({ where: { portfolioId: pf.id } });
  }

  await prisma.portfolio.delete({ where: { id: pf.id } });
  await proxy.dispose();
}
main();
