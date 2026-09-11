import "server-only";
import { prisma } from "@/lib/prisma";
import { SUCCESS_FEE_RATE } from "@/lib/billing/rates";

export async function activateGrowthSubscription(input: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  renewsAt: Date;
}): Promise<void> {
  await prisma.user.update({
    where: { id: input.userId },
    data: { stripeCustomerId: input.stripeCustomerId },
  });

  const existing = await prisma.subscription.findFirst({
    where: { userId: input.userId, status: "ACTIVE" },
    select: { id: true },
    orderBy: { id: "desc" },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan: "GROWTH",
        feeRate: SUCCESS_FEE_RATE.toFixed(4),
        dealQuota: null,
        status: "ACTIVE",
        renewsAt: input.renewsAt,
        stripeSubscriptionId: input.stripeSubscriptionId,
      },
    });
    return;
  }

  await prisma.subscription.create({
    data: {
      userId: input.userId,
      plan: "GROWTH",
      feeRate: SUCCESS_FEE_RATE.toFixed(4),
      dealQuota: null,
      dealsUsed: 0,
      status: "ACTIVE",
      renewsAt: input.renewsAt,
      stripeSubscriptionId: input.stripeSubscriptionId,
    },
  });
}

export async function cancelGrowthSubscription(stripeSubscriptionId: string): Promise<void> {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: "CANCELLED", plan: "FREE" },
  });
}
