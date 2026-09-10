import { NextResponse } from "next/server";
import { getActor } from "@/lib/authz/actor";
import { prisma } from "@/lib/prisma";
import { exportPersonalData } from "@/lib/rgpd/export";

/**
 * Telechargement de l'export personnel, articles 15 et 20 du RGPD.
 *
 * Une route et non une action serveur : le resultat est un fichier a remettre a
 * l'utilisateur, ce qu'une action ne sait pas faire. La demande est tracee dans
 * DataRequest, ce qui vaut preuve que le droit a bien ete servi.
 */
export async function GET(): Promise<NextResponse> {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const data = await exportPersonalData(actor);

  await prisma.dataRequest.create({
    data: {
      userId: actor.id,
      type: "EXPORT",
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  const jour = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees-${jour}.json"`,
      // Un export personnel ne doit jamais etre mis en cache par un
      // intermediaire : il ne concerne qu'une personne.
      "Cache-Control": "private, no-store",
    },
  });
}
