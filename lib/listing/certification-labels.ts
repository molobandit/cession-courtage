export type CertificationDocRow = {
  id: string;
  listingId: string;
  category: string;
  label: string;
  required: number;
  status: string;
  fileName: string | null;
  storageKey: string | null;
  teamComment: string | null;
  uploadedAt: string | null;
};

export function certificationDocStatusLabel(status: string): string {
  if (status === "RECEIVED") return "Document reçu";
  if (status === "TO_COMPLETE") return "Document à compléter";
  if (status === "VALIDATED") return "Document validé";
  return "À déposer";
}
