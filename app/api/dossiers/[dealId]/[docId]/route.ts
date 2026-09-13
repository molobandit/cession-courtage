import { NextResponse } from "next/server";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { isDealParticipant } from "@/lib/authz/policies";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage/objects";

/**
 * Ouverture d'une pièce déposée dans un dossier de cession.
 *
 * Réservée aux deux parties du dossier ; toute autre demande reçoit une 404,
 * comme une pièce qui n'existe pas. Chaque ouverture par la contrepartie est
 * journalisée : le cédant sait ce que l'acquéreur a réellement consulté.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealId: string; docId: string }> },
) {
  const { dealId, docId } = await params;
  const introuvable = NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
  const actor = await getActor();
  if (!actor || !isOriasVerified(actor)) return introuvable;

  const doc = await prisma.document.findFirst({
    where: { id: docId, dealId },
    select: {
      id: true,
      fileName: true,
      storageKey: true,
      contentType: true,
      uploadedById: true,
      slot: true,
      deal: { select: { sellerId: true, buyerId: true } },
    },
  });
  if (!doc || !isDealParticipant(actor, doc.deal)) return introuvable;

  let bytes: Uint8Array;
  try {
    bytes = await getObject(doc.storageKey);
  } catch {
    return introuvable;
  }

  if (doc.uploadedById !== actor.id) {
    await prisma.dataRoomView.create({ data: { dealId, viewerId: actor.id, documentId: doc.id } });
    await prisma.auditLog.create({
      data: { actorId: actor.id, action: "DATA_ROOM_VIEW", entityType: "Document", entityId: doc.id, metadata: { dealId, slot: doc.slot } },
    });
  }

  return new NextResponse(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": doc.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
