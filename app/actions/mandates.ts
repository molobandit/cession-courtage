"use server";

import { FinancingMode, type ClientSegment, type RiskType } from "@prisma/client";
import { firstIssue, mandateSchema } from "@/lib/validations/actions";
import { redirect } from "next/navigation";
import { assignMandatePublicNumber } from "@/lib/mandate/assign-number";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { rematchMandate } from "@/lib/matching/run";
import { prisma } from "@/lib/prisma";

export type MandateFormState = { error?: string };

const RISK_VALUES = new Set<string>([
  "HEALTH_INDIVIDUAL",
  "HEALTH_SENIOR",
  "HEALTH_GROUP",
  "PROVIDENT",
  "LOAN_INSURANCE",
  "AUTO",
  "HOME",
  "MOTORCYCLE",
  "PROFESSIONAL_MULTIRISK",
  "PROFESSIONAL_LIABILITY",
  "DECENNIAL",
  "LEGAL_PROTECTION",
  "FUNERAL",
  "SAVINGS",
  "RETIREMENT",
  "FLEET",
  "LANDLORD",
  "OTHER",
]);

async function requireBuyerActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  if (!canBuy(actor)) throw new ForbiddenError("Réservé aux acquéreurs.");
  return actor;
}

export async function createMandateAction(
  _prev: MandateFormState,
  formData: FormData,
): Promise<MandateFormState> {
  let destination: string | null = null;
  try {
    const actor = await requireBuyerActor();
    const parsedAmounts = mandateSchema.safeParse({
      maxBudget: formData.get("maxBudget"),
      minCommissions: formData.get("minCommissions"),
      maxCommissions: formData.get("maxCommissions"),
    });
    if (!parsedAmounts.success) return { error: firstIssue(parsedAmounts.error) };
    const { maxBudget, minCommissions, maxCommissions } = parsedAmounts.data;
    if (maxBudget < 2000) return { error: "Budget maximum invalide." };
    if (maxCommissions < minCommissions) {
      return { error: "Fourchette de commissions invalide." };
    }
    const riskTypes = formData.getAll("riskTypes").map(String).filter((v) => RISK_VALUES.has(v)) as RiskType[];
    const carriers = String(formData.get("carriers") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const zones = String(formData.get("zones") ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (zones.length === 0) return { error: "Indiquez au moins une zone (NATIONAL, IDF, 75…)." };
    const clientSegments = formData.getAll("clientSegments").map(String) as ClientSegment[];
    const financingRaw = String(formData.get("financingMode") ?? "BOTH");
    const financingMode =
      financingRaw === "CASH" || financingRaw === "CREDIT" ? (financingRaw as FinancingMode) : FinancingMode.BOTH;

    const mandate = await prisma.buyerMandate.create({
      data: {
        buyerId: actor.id,
        maxBudget: maxBudget.toFixed(2),
        minCommissions: minCommissions.toFixed(2),
        maxCommissions: maxCommissions.toFixed(2),
        riskTypes,
        carriers,
        zones,
        clientSegments: clientSegments.length ? clientSegments : ["INDIVIDUAL"],
        financingMode,
        alertsEnabled: formData.get("alertsEnabled") === "on",
      },
    });
    await rematchMandate(mandate.id);
    const publish = formData.get("publish") === "on" || formData.get("publish") === "true";
    if (publish) {
      const publicNumber = await assignMandatePublicNumber(mandate.id);
      destination = `/annonces/demandes/${publicNumber}`;
    } else {
      destination = "/app/opportunites";
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Création impossible." };
  }
  if (destination) redirect(destination);
  return { error: "Création impossible." };
}
