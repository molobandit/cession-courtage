export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function hhi(shares: number[]): number {
  return shares.reduce((sum, share) => sum + share * share, 0);
}

export function topShare(values: number[], n: number, total: number): number {
  if (total <= 0) return 0;
  const top = [...values].sort((a, b) => b - a).slice(0, n);
  return top.reduce((sum, value) => sum + value, 0) / total;
}

export function averageAgeMonths(dates: Date[], now = new Date()): number {
  if (dates.length === 0) return 0;
  const months = dates.map((date) => {
    const age =
      (now.getUTCFullYear() - date.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - date.getUTCMonth());
    return Math.max(0, age);
  });
  return Math.round(months.reduce((a, b) => a + b, 0) / months.length);
}
