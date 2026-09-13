import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/authz/actor";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage/objects";

/**
 * Pièce d'identification d'un compte : visible de son titulaire et des
 * administrateurs qui la contrôlent, de personne d'autre. La contrepartie d'une
 * cession voit « compte vérifié », jamais la pièce d'identité elle-même.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const introuvable = NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
  const actor = await getActor();
  if (!actor) return introuvable;
  const doc = await prisma.accountDocument.findUnique({ where: { id: docId } });
  if (!doc || (doc.userId !== actor.id && !isAdmin(actor))) return introuvable;
  let bytes: Uint8Array;
  try {
    bytes = await getObject(doc.storageKey);
  } catch {
    return introuvable;
  }
  if (doc.userId !== actor.id) {
    await prisma.auditLog.create({
      data: { actorId: actor.id, action: "kyc.document.viewed", entityType: "AccountDocument", entityId: doc.id, metadata: { userId: doc.userId } },
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
