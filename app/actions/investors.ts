"use server";

import { firstIssue, investorInquirySchema } from "@/lib/validations/actions";
import { prisma } from "@/lib/prisma";

export type InvestorFormState = { error?: string; ok?: boolean };

export async function createInvestorInquiryAction(
  _prev: InvestorFormState,
  formData: FormData,
): Promise<InvestorFormState> {
  const parsed = investorInquirySchema.safeParse({
    organisation: formData.get("organisation"),
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    investorType: formData.get("investorType"),
    ticketMinEur: formData.get("ticketMinEur") ?? "",
    ticketMaxEur: formData.get("ticketMaxEur") ?? "",
    zones: formData.get("zones"),
    sectors: formData.get("sectors") ?? "",
    intervention: formData.get("intervention"),
    listingId: formData.get("listingId") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await prisma.investorInquiry.create({
    data: {
      organisation: parsed.data.organisation,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      investorType: parsed.data.investorType,
      ticketMinEur: parsed.data.ticketMinEur ?? null,
      ticketMaxEur: parsed.data.ticketMaxEur ?? null,
      zones: parsed.data.zones,
      intervention: parsed.data.intervention,
      jobTitle: parsed.data.jobTitle ?? null,
      sectors: parsed.data.sectors ?? null,
      listingId: parsed.data.listingId ?? null,
    },
  });

  return { ok: true };
}
