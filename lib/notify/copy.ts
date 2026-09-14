import { BRAND_NAME } from "@/lib/site";

export function offerReceivedCopy(input: {
  publicNumber: number;
  sealed: boolean;
}): { subject: string; bodyText: string } {
  if (input.sealed) {
    return {
      subject: `Nouvelle offre sur le dossier n° ${input.publicNumber}`,
      bodyText: [
        "Une offre a été déposée sur votre dossier.",
        "",
        `Dossier n° ${input.publicNumber}.`,
        "Consultez-la dans votre carnet d’offres : vous pourrez retenir une offre à la clôture de la séance.",
        "",
        `— ${BRAND_NAME}`,
      ].join("\n"),
    };
  }
  return {
    subject: `Nouvelle offre sur le dossier n° ${input.publicNumber}`,
    bodyText: [
      "Une offre a été déposée sur votre dossier.",
      "",
      `Dossier n° ${input.publicNumber}. La fenêtre est close : vous pouvez comparer les montants dans l’espace membre.`,
      "",
      `— ${BRAND_NAME}`,
    ].join("\n"),
  };
}
