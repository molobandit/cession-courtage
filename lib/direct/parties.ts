import "server-only";
import type { DocumentParty } from "@/lib/direct/documents";
import { prisma } from "@/lib/prisma";

const VIDE: DocumentParty = {
  legalName: null,
  legalForm: null,
  siren: null,
  address: null,
  postalCode: null,
  city: null,
  oriasNumber: null,
  representative: null,
  jobTitle: null,
  email: null,
};

/**
 * Identification d'un cabinet pour les pièces du dossier.
 *
 * Tirée du compte et du cabinet rattaché, jamais ressaisie. Une contrepartie
 * sans compte n'a rien à fournir ici : les pièces qui la nomment ne s'ouvrent
 * qu'après son accord, donc après son inscription.
 */
export async function loadDocumentParty(userId: string | null, email?: string | null): Promise<DocumentParty> {
  if (!userId) return { ...VIDE, email: email ?? null };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      fullName: true,
      jobTitle: true,
      oriasNumber: true,
      oriasLookupName: true,
      oriasLookupSiren: true,
      firm: {
        select: {
          legalName: true,
          legalForm: true,
          siren: true,
          address: true,
          postalCode: true,
          city: true,
        },
      },
    },
  });
  if (!user) return { ...VIDE, email: email ?? null };
  return {
    legalName: user.firm?.legalName ?? user.oriasLookupName ?? null,
    legalForm: user.firm?.legalForm ?? null,
    siren: user.firm?.siren ?? user.oriasLookupSiren ?? null,
    address: user.firm?.address ?? null,
    postalCode: user.firm?.postalCode ?? null,
    city: user.firm?.city ?? null,
    oriasNumber: user.oriasNumber,
    representative: user.fullName,
    jobTitle: user.jobTitle,
    email: user.email,
  };
}
