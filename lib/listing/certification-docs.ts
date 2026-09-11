import "server-only";
import { prisma } from "@/lib/prisma";
import type { CertificationDocRow } from "@/lib/listing/certification-labels";

export type { CertificationDocRow } from "@/lib/listing/certification-labels";
export { certificationDocStatusLabel } from "@/lib/listing/certification-labels";
export { CERTIFICATION_SLOTS } from "@/lib/listing/certification-slots";

function toRow(doc: {
  id: string;
  listingId: string;
  category: string;
  label: string;
  required: boolean;
  status: string;
  fileName: string | null;
  storageKey: string | null;
  teamComment: string | null;
  uploadedAt: Date | null;
}): CertificationDocRow {
  return {
    id: doc.id,
    listingId: doc.listingId,
    category: doc.category,
    label: doc.label,
    required: doc.required ? 1 : 0,
    status: doc.status,
    fileName: doc.fileName,
    storageKey: doc.storageKey,
    teamComment: doc.teamComment,
    uploadedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : null,
  };
}

export async function ensureCertificationSlots(listingId: string): Promise<CertificationDocRow[]> {
  const existing = await listCertificationDocs(listingId);
  if (existing.length > 0) return existing;

  try {
    await prisma.certificationDocument.createMany({
      data: CERTIFICATION_SLOTS.map((slot) => ({
        listingId,
        category: slot.category,
        label: slot.label,
        required: slot.required,
        status: "MISSING",
      })),
    });
  } catch (error) {
    console.error("ensureCertificationSlots", error);
    return [];
  }
  return listCertificationDocs(listingId);
}

export async function listCertificationDocs(listingId: string): Promise<CertificationDocRow[]> {
  try {
    const rows = await prisma.certificationDocument.findMany({
      where: { listingId },
      orderBy: [{ required: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toRow);
  } catch (error) {
    console.error("listCertificationDocs", error);
    return [];
  }
}

export async function findCertificationDoc(
  documentId: string,
  listingId: string,
): Promise<CertificationDocRow | null> {
  try {
    const row = await prisma.certificationDocument.findFirst({
      where: { id: documentId, listingId },
    });
    return row ? toRow(row) : null;
  } catch (error) {
    console.error("findCertificationDoc", error);
    return null;
  }
}

export async function markCertificationDocReceived(
  documentId: string,
  fileName: string,
  storageKey: string,
): Promise<void> {
  await prisma.certificationDocument.update({
    where: { id: documentId },
    data: { status: "RECEIVED", fileName, storageKey, uploadedAt: new Date() },
  });
}
