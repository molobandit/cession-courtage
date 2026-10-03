import { redirect } from "next/navigation";

/**
 * Ancien carnet d'offres du cédant.
 *
 * Le modèle ne connaît plus d'offres : un acquéreur se positionne en versant
 * son dépôt, et le cédant suit ses candidats depuis la fiche de son annonce.
 * L'adresse reste valable pour les liens déjà partagés, et renvoie là où se
 * lit désormais la même information. Le modèle de données, lui, est intact.
 */
export default async function ListingOffersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/annonces/${id}`);
}
