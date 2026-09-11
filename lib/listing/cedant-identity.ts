import "server-only";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CedantIdentity = {
  legalName: string;
  legalForm: string;
  address: string;
  postalCode: string;
  city: string;
  oriasNumber: string;
  fullName: string | null;
  email: string;
  phone: string | null;
};

export async function loadCedantIdentity(listingId: string): Promise<CedantIdentity | null> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { portfolio: { select: { firmId: true } } },
  });
  const firmId = listing?.portfolio.firmId;
  if (!firmId) return null;

  const [firm, contact] = await Promise.all([
    prisma.firm.findUnique({
      where: { id: firmId },
      select: { legalName: true, legalForm: true, address: true, postalCode: true, city: true },
    }),
    prisma.user.findFirst({
      where: { firmId, role: { in: [UserRole.SELLER, UserRole.BOTH] } },
      select: { fullName: true, email: true, phone: true, oriasNumber: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!firm || !contact) return null;
  return {
    legalName: firm.legalName,
    legalForm: firm.legalForm,
    address: firm.address,
    postalCode: firm.postalCode,
    city: firm.city,
    oriasNumber: contact.oriasNumber,
    fullName: contact.fullName,
    email: contact.email,
    phone: contact.phone,
  };
}
