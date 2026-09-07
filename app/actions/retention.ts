"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz";
import { isDealParticipant } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { parseFrenchNumber } from "@/lib/import/values";
import { prisma } from "@/lib/prisma";
import { adjustedDeferredAmount } from "@/lib/retention/adjust";

export type RetentionFormState = { error?: string };

export async function submitRetentionReportAction(
  _prev: RetentionFormState,
  formData: FormData,
): Promise<RetentionFormState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
    const dealId = String(formData.get("dealId") ?? "");
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || !isDealParticipant(actor, deal)) return { error: "Dossier inaccessible." };
    if (deal.stage !== "RETENTION" && deal.stage !== "CLOSED") {
      return { error: "La rétention n'est ouverte qu'après transfert." };
    }
    const monthIndex = Number(formData.get("monthIndex") ?? "");
    if (![3, 6, 12].includes(monthIndex)) return { error: "Échéance M+3, M+6 ou M+12 uniquement." };
    const contractsTransferred = Number(formData.get("contractsTransferred") ?? "");
    const contractsRetained = Number(formData.get("contractsRetained") ?? "");
    const actual = parseFrenchNumber(String(formData.get("actualCommissions") ?? ""));
    if (!Number.isFinite(contractsTransferred) || contractsTransferred <= 0) {
      return { error: "Nombre de contrats transférés invalide." };
    }
    if (!Number.isFinite(contractsRetained) || contractsRetained < 0 || contractsRetained > contractsTransferred) {
      return { error: "Contrats conservés invalides." };
    }
    if (actual == null || actual < 0) return { error: "Commissions encaissées invalides." };
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

    if (monthIndex === 12) {
      const adjusted = adjustedDeferredAmount({
        deferredAmount: Number(deal.deferredAmount),
        retentionRate,
        targetRate: Number(deal.retentionTargetRate),
      });
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          adjustedDeferredAmount: adjusted.toFixed(2),
          stage: "CLOSED",
        },
      });
    } else if (deal.stage === "RETENTION") {
      await prisma.deal.update({ where: { id: dealId }, data: { stage: "RETENTION" } });
    }

    revalidatePath(`/app/dossiers/${dealId}`);
    revalidatePath(`/app/dossiers/${dealId}/retention`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Déclaration impossible." };
  }
}
