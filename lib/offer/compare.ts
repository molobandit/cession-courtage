export type RankableOffer = {
  id: string;
  amount: number;
  upfrontPercent: number;
  status: string;
};

const STATUS_WEIGHT: Record<string, number> = {
  ACCEPTED: 0,
  SUBMITTED: 1,
  DECLINED: 2,
  WITHDRAWN: 3,
};

export function rankOffers<T extends RankableOffer>(offers: T[]): T[] {
  return [...offers].sort((a, b) => {
    const status = (STATUS_WEIGHT[a.status] ?? 9) - (STATUS_WEIGHT[b.status] ?? 9);
    if (status !== 0) return status;
    return b.amount - a.amount;
  });
}

export function vsAsking(amount: number, asking: number): { ratio: number; delta: number } {
  if (asking <= 0) return { ratio: 0, delta: amount };
  return { ratio: amount / asking, delta: amount - asking };
}

export function cashSplit(amount: number, upfrontPercent: number): { cash: number; deferred: number } {
  const cash = amount * (upfrontPercent / 100);
  return { cash, deferred: Math.max(0, amount - cash) };
}

export function barScale(asking: number, amounts: number[]): number {
  return Math.max(asking, ...amounts, 1);
}
