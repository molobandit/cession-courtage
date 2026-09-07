import type { ValuationBreakdown } from "@/lib/valuation/types";

export function parseValuationBreakdown(value: unknown): ValuationBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ValuationBreakdown>;
  if (!Array.isArray(record.adjustments) || typeof record.midValue !== "number") return null;
  return record as ValuationBreakdown;
}
