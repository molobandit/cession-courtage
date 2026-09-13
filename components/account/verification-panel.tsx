import { AccountDocumentUpload } from "@/components/account/account-document-upload";
import { ACCOUNT_PIECES, VERIFICATION_LABELS, type VerificationStatus } from "@/lib/account/verification";
import { formatDate } from "@/lib/format/fr";
import { cn } from "@/lib/utils";

/**
 * Compte vérifié, une fois pour toutes.
 *
 * Quatre pièces, déposées ici et nulle part ailleurs. La contrepartie d'une
 * cession ne les voit pas : elle voit que la plateforme les a contrôlées.
 */
export function VerificationPanel({
  status,
  note,
  reviewedAt,
  documents,
  missingProfile,
}: {
  status: VerificationStatus;
  note: string | null;
  reviewedAt: Date | null;
  documents: { id: string; kind: string; fileName: string; createdAt: Date }[];
  missingProfile: string[];
}) {
  const ton =
    status === "VERIFIED" ? "border-ok/30 bg-ok/5 text-ok" : status === "REJECTED" ? "border-danger/30 bg-danger/5 text-danger" : status === "PENDING" ? "border-indigo-line bg-indigo-soft text-indigo-dark" : "border-line bg-surface-alt text-ink";
  const deposees = ACCOUNT_PIECES.filter((p) => documents.some((d) => d.kind === p.kind)).length;
  return (
    <div className="grid gap-4">
      <div className={cn("rounded-2xl border px-4 py-3", ton)}>
        <p className="text-[15px] font-semibold">
          {status === "VERIFIED" ? "✓ " : ""}
          {VERIFICATION_LABELS[status]}
          {status === "VERIFIED" && reviewedAt ? <span className="font-normal text-ink/70"> · le {formatDate(reviewedAt)}</span> : null}
        </p>
        <p className="mt-0.5 text-[14px] text-ink">
          {status === "VERIFIED"
            ? "Vos pièces valent pour toutes vos cessions : rien à redonner dans les dossiers."
            : status === "PENDING"
              ? "Pièces transmises. La plateforme les contrôle ; vos dossiers avancent dès la validation."
              : status === "REJECTED"
                ? `Motif : ${note ?? "non précisé"}. Remplacez la pièce concernée, le compte repart en vérification.`
                : `${deposees} pièce${deposees > 1 ? "s" : ""} sur ${ACCOUNT_PIECES.length}. Le compte part en vérification dès la dernière déposée.`}
        </p>
      </div>
      {missingProfile.length ? (
        <p className="rounded-xl border border-warn/30 bg-warn/5 px-3 py-2 text-[13px] text-ink">
          Complétez aussi le profil du cabinet ci-dessus : {missingProfile.join(", ")}. Ces informations figurent sur le protocole de cession.
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {ACCOUNT_PIECES.map((piece) => {
          const doc = [...documents].reverse().find((d) => d.kind === piece.kind);
          return (
            <li key={piece.kind} className="rounded-2xl border border-line bg-paper p-4">
              <p className="text-[14px] font-semibold text-ink">
                <span className={doc ? "text-ok" : "text-muted"}>{doc ? "✓ " : "○ "}</span>
                {piece.label}
              </p>
              <p className="text-[12px] text-muted">{piece.detail}</p>
              {doc ? (
                <p className="mt-1.5 text-[13px]">
                  <a href={`/api/compte/documents/${doc.id}`} target="_blank" rel="noreferrer" className="font-medium text-indigo-dark underline-offset-2 hover:underline">
                    {doc.fileName}
                  </a>{" "}
                  <span className="text-muted">· {formatDate(doc.createdAt)}</span>
                </p>
              ) : null}
              <div className="mt-2">
                <AccountDocumentUpload kind={piece.kind} replace={Boolean(doc)} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
