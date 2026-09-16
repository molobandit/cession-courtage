import { permanentRedirect } from "next/navigation";

/** Ancienne adresse de la page d'étude : les liens déjà partagés restent valables. */
export default function AncienneAdresseEtude() {
  permanentRedirect("/etude-portefeuille");
}
