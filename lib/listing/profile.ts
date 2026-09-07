import type { ClientSegment, RiskType } from "@prisma/client";

export type LineForProfile = {
  riskType: RiskType;
  carrier: string;
  clientSegment: ClientSegment;
  department: string;
  annualCommission: number;
};

export type ListingProfile = {
  askingPrice: number;
  annualCommissions: number;
  contractCount: number;
  clientCount: number;
  riskTypes: RiskType[];
  riskMix: { riskType: RiskType; share: number; commissions: number }[];
  carriers: string[];
  clientSegments: ClientSegment[];
  departments: string[];
};

export function profileFromLines(lines: LineForProfile[]): Omit<ListingProfile, "askingPrice"> {
  const byRisk = new Map<RiskType, number>();
  const carriers = new Set<string>();
  const segments = new Set<ClientSegment>();
  const departments = new Set<string>();
  const clients = new Set<string>();
  let annualCommissions = 0;

  for (const line of lines) {
    annualCommissions += line.annualCommission;
    byRisk.set(line.riskType, (byRisk.get(line.riskType) ?? 0) + line.annualCommission);
    carriers.add(line.carrier);
    segments.add(line.clientSegment);
    departments.add(line.department);
  }

  const riskMix = [...byRisk.entries()]
    .map(([riskType, commissions]) => ({
      riskType,
      commissions,
      share: annualCommissions > 0 ? commissions / annualCommissions : 0,
    }))
    .sort((a, b) => b.commissions - a.commissions);

  return {
    annualCommissions,
    contractCount: lines.length,
    clientCount: clients.size,
    riskTypes: riskMix.map((r) => r.riskType),
    riskMix,
    carriers: [...carriers].sort(),
    clientSegments: [...segments],
    departments: [...departments],
  };
}

export function profileFromLinesWithClients(
  lines: (LineForProfile & { clientKey: string })[],
): Omit<ListingProfile, "askingPrice"> {
  const base = profileFromLines(lines);
  const clients = new Set(lines.map((l) => l.clientKey));
  return { ...base, clientCount: clients.size };
}
