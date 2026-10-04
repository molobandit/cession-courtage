/**
 * Une position dont l'annonce a disparu ne doit pas casser le tableau de bord.
 *
 * D1 n'applique pas les clés étrangères de la même façon selon le chemin
 * d'écriture : en ligne, supprimer des annonces du catalogue a laissé derrière
 * elles des positions pointant dans le vide. Prisma tient la relation pour
 * obligatoire et refusait alors la requête entière, ce qui renvoyait une 500
 * sur l'accueil, les achats et les ventes.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importé directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { listListingPositions, listMyPositions } from "@/lib/position/load";

const ORPHELINE = "pos_orpheline_essai";
let acheteur: string;

beforeAll(async () => {
  const p = await prisma.buyerPosition.findFirst({ select: { buyerId: true } });
  if (!p) throw new Error("Aucune position en base. Lancez npm run db:seed.");
  acheteur = p.buyerId;
  /*
   * La base locale applique la clé étrangère et refuse l'orpheline : on essaie,
   * et le test se contente alors de vérifier le contrat sur les lignes saines.
   * La base distante, elle, a bel et bien laissé passer le cas.
   */
  try {
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys=OFF");
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO BuyerPosition (id, listingId, buyerId, createdAt, updatedAt)
       VALUES ('${ORPHELINE}', 'lst_annonce_disparue', '${acheteur}', '2026-10-04T11:00:00.000Z', '2026-10-04T11:00:00.000Z')`,
    );
  } catch {
    // Clé étrangère appliquée : l'orpheline n'a pas pu naître ici.
  }
});

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DELETE FROM BuyerPosition WHERE id = '${ORPHELINE}'`).catch(() => undefined);
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys=ON").catch(() => undefined);
  await disposePlatformProxy();
});

it("une position orpheline ne fait pas tomber le tableau de bord", async () => {
  const positions = await listMyPositions(acheteur);
  expect(positions.every((p) => p.position.listing !== null)).toBe(true);
  expect(positions.map((p) => p.position.id)).not.toContain(ORPHELINE);

  // Le même filtre protège la liste des candidats d'une annonce.
  await expect(listListingPositions("lst_annonce_disparue")).resolves.toEqual([]);
});
