"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz";
import { isDealParticipant } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { firstIssue, retentionReportSchema } from "@/lib/validations/actions";
import { prisma } from "@/lib/prisma";
import { notifyDealEvent } from "@/lib/position/events";

export type RetentionFormState = { error?: string };

export async function submitRetentionReportAction(
  _prev: RetentionFormState,
  formData: FormData,
): Promise<RetentionFormState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
    const parsed = retentionReportSchema.safeParse({
      dealId: formData.get("dealId"),
      monthIndex: formData.get("monthIndex"),
      contractsRetained: formData.get("contractsRetained"),
      contractsTransferred: formData.get("contractsTransferred"),
      actualCommissions: formData.get("actualCommissions"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const {
      dealId,
      monthIndex,
      contractsRetained,
      contractsTransferred,
      actualCommissions: actual,
    } = parsed.data;

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || !isDealParticipant(actor, deal)) return { error: "Dossier inaccessible." };
    if (deal.stage !== "RETENTION") {
      return {
        error:
          deal.stage === "CLOSED"
            ? "La cession est close : la déclaration ne se modifie plus."
            : "La conservation se déclare après le transfert des contrats.",
      };
    }
    // C'est l'acquéreur qui détient le portefeuille après le transfert : lui seul sait ce qui reste.
    if (actor.id !== deal.buyerId) return { error: "La conservation est déclarée par l’acquéreur." };
    const retentionRate = contractsRetained / contractsTransferred;

    await prisma.retentionReport.upsert({
      where: { dealId_monthIndex: { dealId, monthIndex } },
      update: {
        contractsRetained,
        contractsTransferred,
        actualCommissions: actual.toFixed(2),
        retentionRate: retentionRate.toFixed(4),
        reportedAt: new Date(),
      },
      create: {
        dealId,
        monthIndex,
        contractsRetained,
        contractsTransferred,
        actualCommissions: actual.toFixed(2),
        retentionRate: retentionRate.toFixed(4),
      },
    });

    /*
     * La déclaration ne clôt plus rien d'elle-même : à douze mois, le cédant la
     * valide, et c'est sa validation qui libère le séquestre et le solde ajusté.
     * Une déclaration modifiée après validation doit être validée de nouveau.
     */
    await notifyDealEvent({
      dealId,
      actorId: actor.id,
      key: `retention:${monthIndex}:${Date.now()}`,
      title: `Conservation déclarée à M+${monthIndex}`,
      body:
        monthIndex === 12
          ? `L’acquéreur déclare ${contractsRetained} contrats conservés sur ${contractsTransferred}. Validez la déclaration pour clore la cession.`
          : `L’acquéreur déclare ${contractsRetained} contrats conservés sur ${contractsTransferred}.`,
    }).catch((e) => console.error("notifyDealEvent", e));

    revalidatePath(`/app/dossiers/${dealId}`);
    revalidatePath(`/app/dossiers/${dealId}/retention`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Déclaration impossible." };
  }
}
