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

  const id = crypto.randomUUID();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO InvestorInquiry (
        id, organisation, fullName, email, phone, investorType,
        ticketMinEur, ticketMaxEur, zones, intervention, jobTitle, sectors, listingId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      parsed.data.organisation,
      parsed.data.fullName,
      parsed.data.email,
      parsed.data.phone ?? null,
      parsed.data.investorType,
      parsed.data.ticketMinEur ?? null,
      parsed.data.ticketMaxEur ?? null,
      parsed.data.zones,
      parsed.data.intervention,
      parsed.data.jobTitle ?? null,
      parsed.data.sectors ?? null,
      parsed.data.listingId ?? null,
    );
  } catch {
    await prisma.$executeRawUnsafe(
      `INSERT INTO InvestorInquiry (
        id, organisation, fullName, email, phone, investorType,
        ticketMinEur, ticketMaxEur, zones, intervention
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      parsed.data.organisation,
      parsed.data.fullName,
      parsed.data.email,
      parsed.data.phone ?? null,
      parsed.data.investorType,
      parsed.data.ticketMinEur ?? null,
      parsed.data.ticketMaxEur ?? null,
      parsed.data.zones,
      parsed.data.intervention,
    );
  }

  return { ok: true };
}
