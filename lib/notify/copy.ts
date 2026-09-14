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
        `L’équipe ${BRAND_NAME}`,
      ].join("\n"),
    };
  }
  return {
    subject: `Nouvelle offre sur le dossier n° ${input.publicNumber}`,
    bodyText: [
      "Une offre a été déposée sur votre dossier.",
      "",
      `Dossier n° ${input.publicNumber}. La séance est close : comparez les offres et retenez-en une depuis votre carnet d’offres.`,
      "",
      `L’équipe ${BRAND_NAME}`,
    ].join("\n"),
  };
}
