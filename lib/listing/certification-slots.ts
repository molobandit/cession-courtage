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

export type CertificationSlotProgress = {
  slotCount: number;
  received: number;
  validated: number;
  requiredMissing: number;
};

export function summarizeCertificationSlots(
  docs: Array<{ category: string; label: string; status: string }>,
): CertificationSlotProgress {
  const byKey = new Map(docs.map((doc) => [`${doc.category}:${doc.label}`, doc]));
  let received = 0;
  let validated = 0;
  let requiredMissing = 0;

  for (const slot of CERTIFICATION_SLOTS) {
    const status = byKey.get(`${slot.category}:${slot.label}`)?.status ?? "MISSING";
    if (status === "VALIDATED") {
      validated += 1;
      received += 1;
    } else if (status === "RECEIVED") {
      received += 1;
    }
    if (slot.required && status !== "RECEIVED" && status !== "VALIDATED") {
      requiredMissing += 1;
    }
  }

  return {
    slotCount: CERTIFICATION_SLOTS.length,
    received,
    validated,
    requiredMissing,
  };
}
