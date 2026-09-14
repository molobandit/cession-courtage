import { notFound, redirect } from "next/navigation";
import { GeneratedDocumentView, type ElectronicSignature } from "@/components/documents/generated-document";
import { getActor, isOriasVerified } from "@/lib/authz";
import { isDealParticipant } from "@/lib/authz/policies";
import { dealPieces } from "@/lib/deal/pieces";
import { documentHash, loadDealProcess } from "@/lib/deal/process-load";
import { buildClientNotice, buildDocument, buildLetterOfIntent, buildTransferDeed } from "@/lib/direct/documents";

export const metadata = { title: "Pièce du dossier" };

export default async function DealPiecePage({ params }: { params: Promise<{ id: string; piece: string }> }) {
  const actor = await getActor();
  const { id, piece } = await params;
  if (!actor) redirect(`/connexion?next=/app/dossiers/${id}/pieces/${piece}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const p = await loadDealProcess(id);
  if (!p || !isDealParticipant(actor, p.deal)) notFound();
  const { deal } = p;

  // Une pièce qui n'est pas encore ouverte n'existe pas, même en tapant l'adresse.
  const disponible = dealPieces({ stage: deal.stage, carriers: p.carriers }).find((x) => x.key === piece);
  if (!disponible?.available) notFound();

  const ctx = p.context();
  const doc =
    piece === "lettre-intention"
      ? buildLetterOfIntent(ctx)
      : piece === "courrier-clients"
        ? buildClientNotice(ctx)
        : buildDocument(piece, ctx);
  if (!doc) notFound();

  const nom = (userId: string) => (userId === deal.sellerId ? p.parties.seller : p.parties.buyer).representative ?? "Signataire";
  const deedHash = documentHash(buildTransferDeed(ctx));
  const signaturesProtocole = (libelleAcheteur: string): ElectronicSignature[] =>
    deal.signoffs
      .filter((s) => s.kind === "DEED_SIGNED" && s.contentHash === deedHash)
      .map((s) => ({
        label: s.userId === deal.sellerId ? "Le cédant" : libelleAcheteur,
        name: s.signatureName ?? nom(s.userId),
        signedAt: s.createdAt,
        hash: s.contentHash,
      }));

  let signatures: ElectronicSignature[] = [];
  if (piece === "protocole" || piece.startsWith("attestation-")) {
    signatures = signaturesProtocole("Le cessionnaire");
  } else if (piece === "confidentialite") {
    signatures = deal.signoffs
      .filter((s) => s.kind === "NDA_SIGNED")
      .map((s) => ({ label: s.userId === deal.sellerId ? "Le cédant" : "Le cessionnaire", name: nom(s.userId), signedAt: s.createdAt, hash: null }));
  } else if (piece === "lettre-intention") {
    const nda = (userId: string) => deal.signoffs.find((s) => s.kind === "NDA_SIGNED" && s.userId === userId)?.createdAt;
    const acheteur = nda(deal.buyerId);
    const cedant = deal.signoffs.find((s) => s.kind === "LOI_ACCEPTED")?.createdAt ?? nda(deal.sellerId);
    if (acheteur) signatures.push({ label: "L’acquéreur", name: nom(deal.buyerId), signedAt: acheteur, hash: null });
    if (cedant) signatures.push({ label: "Le cédant", name: nom(deal.sellerId), signedAt: cedant, hash: null });
  }

  return (
    <GeneratedDocumentView
      doc={doc}
      issuedAt={ctx.issuedAt}
      backHref={`/app/dossiers/${deal.id}`}
      signatures={signatures}
      electronic
      banner={
        piece.startsWith("attestation-") ? (
          <p className="rounded-xl border border-indigo-line bg-indigo-soft px-4 py-3 text-[14px] text-ink">
            Attestation signée électroniquement par les deux parties avec le protocole. Enregistrez-la en PDF (Imprimer →
            Enregistrer au format PDF) et adressez-la à la compagnie avec l’extrait Kbis et l’attestation ORIAS.
          </p>
        ) : null
      }
    />
  );
}
