"use server";

import { revalidatePath } from "next/cache";
import { canSell, getActor, getMyPortfolio, isOriasVerified } from "@/lib/authz";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { valuePortfolio } from "@/lib/valuation/run";

export type ActionState = { error?: string; ok?: boolean };

async function requireSellerActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  if (!canSell(actor)) throw new ForbiddenError("Réservé aux cédants.");
  return actor;
}

export async function recalculateValuationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireSellerActor();
    const portfolioId = String(formData.get("portfolioId") ?? "");
    await getMyPortfolio(portfolioId, actor);
    await valuePortfolio(portfolioId);
    revalidatePath(`/app/portefeuilles/${portfolioId}`);
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Calcul impossible." };
  }
}
