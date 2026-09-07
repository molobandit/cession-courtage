export function adjustedDeferredAmount(input: {
  deferredAmount: number;
  retentionRate: number;
  targetRate?: number;
}): number {
  const target = input.targetRate ?? 0.9;
  if (target <= 0) return input.deferredAmount;
  const ratio = input.retentionRate / target;
  const clamped = Math.min(1, Math.max(0.5, ratio));
  return Math.round(input.deferredAmount * clamped * 100) / 100;
}
