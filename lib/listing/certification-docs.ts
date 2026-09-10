import "server-only";
import { prisma } from "@/lib/prisma";
import type { CertificationDocRow } from "@/lib/listing/certification-labels";

export type { CertificationDocRow } from "@/lib/listing/certification-labels";
export { certificationDocStatusLabel } from "@/lib/listing/certification-labels";

export const CERTIFICATION_SLOTS = [
  { category: "IDENTITY", label: "Extrait Kbis ou justificatif d’immatriculation", required: true },
  { category: "IDENTITY", label: "Justificatif d’identité du représentant légal", required: true },
  { category: "IDENTITY", label: "Justificatif ORIAS", required: true },
  { category: "IDENTITY", label: "Statuts ou documents juridiques", required: false },
  { category: "PORTFOLIO", label: "États de portefeuille", required: true },
  { category: "PORTFOLIO", label: "Bordereaux de commissions", required: true },
  { category: "PORTFOLIO", label: "Relevés des compagnies", required: false },
  { category: "PORTFOLIO", label: "Documents concernant les précomptes", required: false },
] as const;

export async function ensureCertificationSlots(listingId: string): Promise<CertificationDocRow[]> {
  const existing = await listCertificationDocs(listingId);
  if (existing.length > 0) return existing;

  try {
    for (const slot of CERTIFICATION_SLOTS) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO CertificationDocument (id, listingId, category, label, required, status)
         VALUES (?, ?, ?, ?, ?, 'MISSING')`,
        crypto.randomUUID(),
        listingId,
        slot.category,
        slot.label,
        slot.required ? 1 : 0,
      );
    }
  } catch (error) {
    console.error("ensureCertificationSlots", error);
    return [];
  }
  return listCertificationDocs(listingId);
}

export async function listCertificationDocs(listingId: string): Promise<CertificationDocRow[]> {
  try {
    return await prisma.$queryRawUnsafe<CertificationDocRow[]>(
      `SELECT id, listingId, category, label, required, status, fileName, storageKey, teamComment, uploadedAt
       FROM CertificationDocument WHERE listingId = ? ORDER BY required DESC, createdAt ASC`,
      listingId,
    );
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
    const rows = await prisma.$queryRawUnsafe<CertificationDocRow[]>(
      `SELECT id, listingId, category, label, required, status, fileName, storageKey, teamComment, uploadedAt
       FROM CertificationDocument WHERE id = ? AND listingId = ?`,
      documentId,
      listingId,
    );
    return rows[0] ?? null;
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
  await prisma.$executeRawUnsafe(
    `UPDATE CertificationDocument
     SET status = 'RECEIVED', fileName = ?, storageKey = ?, uploadedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    fileName,
    storageKey,
    documentId,
  );
}
