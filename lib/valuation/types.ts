import type { CommissionType, DistributionMode, RiskType } from "@prisma/client";

export const ALGORITHM_VERSION = "cascade-1.0";

export const RANGE_LOW_FACTOR = 0.85;
export const RANGE_HIGH_FACTOR = 1.15;
export const ADVANCED_COMMISSION_FACTOR = 0.5;

export type ValuationLine = {
  carrier: string;
  riskType: RiskType;
  annualCommission: number;
  commissionType: CommissionType;
  clientKey: string;
  effectiveDate?: Date;
};

export type ValuationFirm = {
  distributionMode: DistributionMode;
  complianceScore: number;
};

export type ValuationAdjustment = {
  key: string;
  label: string;
  factor: number;
  impactEur: number;
};

export type ValuationAction = {
  title: string;
  detail: string;
  impactEur: number;
};

export type ValuationMetrics = {
  herfindahl: number;
  top10Share: number;
  averageAgeMonths: number;
  churnRate12m: number;
  contractCount: number;
  clientCount: number;
  annualCommissions: number;
};

export type ValuationBreakdown = {
  grossValue: number;
  adjustments: ValuationAdjustment[];
  midValue: number;
  lowValue: number;
  highValue: number;
  qualityScore: number;
  actions: ValuationAction[];
  metrics: ValuationMetrics;
  algorithmVersion: string;
};

export type ComputeValuationInput = {
  lines: ValuationLine[];
  firm: ValuationFirm;
  sellerSupportMonths: number;
  churnRate12m: number;
  averageAgeMonths: number;
  multiples: Partial<Record<RiskType, number>>;
};
