export { computeValuation, resolveMultiple } from "@/lib/valuation/compute";
export { DEFAULT_MULTIPLES } from "@/lib/valuation/defaults";
export { ALGORITHM_VERSION, ADVANCED_COMMISSION_FACTOR, RANGE_HIGH_FACTOR, RANGE_LOW_FACTOR } from "@/lib/valuation/types";
export type {
  ComputeValuationInput,
  ValuationAction,
  ValuationAdjustment,
  ValuationBreakdown,
  ValuationFirm,
  ValuationLine,
  ValuationMetrics,
} from "@/lib/valuation/types";
export { averageAgeMonths, hhi, round2, topShare } from "@/lib/valuation/metrics";
