import type { RiskType } from "@prisma/client";

/** Default multiples (€ of value per € of annual commission). Overridden by ValuationMultiple in DB. */
export const DEFAULT_MULTIPLES: Record<RiskType, number> = {
  HEALTH_INDIVIDUAL: 3.1,
  HEALTH_SENIOR: 2.9,
  HEALTH_GROUP: 3.3,
  PROFESSIONAL_MULTIRISK: 3.5,
  PROFESSIONAL_LIABILITY: 3.4,
  DECENNIAL: 3.0,
  PROVIDENT: 2.8,
  FUNERAL: 2.6,
  LEGAL_PROTECTION: 2.4,
  AUTO: 2.2,
  HOME: 2.3,
  MOTORCYCLE: 2.0,
  LANDLORD: 2.5,
  SAVINGS: 2.7,
  RETIREMENT: 2.7,
  FLEET: 3.2,
  LOAN_INSURANCE: 1.4,
  OTHER: 2.0,
};
