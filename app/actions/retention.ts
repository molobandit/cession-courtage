"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz";
import { isDealParticipant } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { firstIssue, retentionReportSchema } from "@/lib/validations/actions";
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
    if (deal.stage !== "RETENTION" && deal.stage !== "CLOSED") {
      return { error: "La rétention n'est ouverte qu'après transfert." };
    }
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
