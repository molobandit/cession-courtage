/**
 * La page investisseurs, dans les mots du dossier investisseurs.
 *
 * Le lecteur n'est pas du métier : des phrases courtes, et rien qu'il doive
 * relire. Le détail, le mandat de gestion, l'alias, l'anonymat des assurés,
 * s'explique pendant l'entretien et dans l'espace investisseur. Aucune promesse
 * de rendement, jamais de rente chiffrée.
 *
 * Un seul endroit pour ces phrases : la page les affiche, le PDF les dit déjà,
 * et les deux ne doivent jamais diverger.
 */

export const INVESTORS_KICKER = "Investisseurs privés et family offices";
export const INVESTORS_TITLE = "Investissez dans des portefeuilles d’assurance";
export const INVESTORS_LEDE =
  "Un revenu de commissions qui se reconduit année après année. Des dossiers étudiés et vérifiés avant de vous être présentés.";
export const INVESTORS_SIGNUP_CTA = "Créer un compte investisseur";
export const INVESTORS_SIGNUP_HREF = "/inscription?voie=investir";

/** Les trois chiffres que les deux dossiers de référence autorisent. */
export const INVESTORS_FIGURES = [
  { value: "50+", label: "points de contrôle par dossier" },
  { value: "100 %", label: "des fonds passent par un trust" },
  { value: "20 %", label: "séquestrés après la vente" },
] as const;

export const INVESTORS_STEPS_TITLE = "Investir en 3 étapes";
export const INVESTORS_STEPS = [
  { num: "1", title: "Ouvrez votre compte", body: "Sans être courtier." },
  { num: "2", title: "Choisissez votre montant", body: "Dossier par dossier." },
  { num: "3", title: "Nous vous accompagnons", body: "Jusqu’au transfert des contrats." },
] as const;

export const INVESTORS_PROTECTION_TITLE = "Votre argent est protégé";
export const INVESTORS_PROTECTION = [
  { title: "Un trust", body: "Les fonds ne sont libérés qu’après vérification." },
  {
    title: "Un séquestre de 20 %",
    body: "Il vous revient, au prorata, si le portefeuille perd plus de 10 %.",
  },
  { title: "Des dossiers vérifiés", body: "Contrats contrôlés par nos avocats." },
] as const;

export const INVESTORS_CLOSING_TITLE = "Parlons de votre projet";
/*
 * Le bloc d'entretien, sur la page investisseurs et sur le tableau de bord.
 *
 * Deux pièges évités. Nommer le fondateur à côté du bouton promettait de
 * l'avoir au bout du fil, ce que personne ne peut tenir. Et mettre ses années
 * de courtage à la place laissait un état de service suspendu sous un conseiller
 * anonyme. La ligne dit donc à quoi sert l'appel, ce qui est la seule chose que
 * le lecteur se demande avant de cliquer.
 */
export const ADVISOR_TITLE = "Un conseiller vous répond";
export const ADVISOR_INVESTORS_LINE =
  "Trente minutes pour cadrer ce que vous cherchez : taille de dossier, branches, zone.";
export const ADVISOR_MEMBER_LINE = "Trente minutes, sur le dossier de votre choix.";
export const INVESTORS_SIGNATURE = ADVISOR_INVESTORS_LINE;
