/**
 * Refuse les numéros de portable dans les échanges, pour garder la négociation
 * sur la plateforme (06 / 07 et préfixes +33 6 / 7, y compris séparateurs).
 */

const MOBILE =
  /(?:\+|00)?33[\s./-]*[67](?:[\s./-]*\d){8}|(?<!\d)0[\s./-]*[67](?:[\s./-]*\d){8}(?!\d)/;

export function containsFrenchMobile(text: string): boolean {
  if (!text) return false;
  const compact = text.replace(/[\u00A0]/g, " ");
  return MOBILE.test(compact);
}

export function offPlatformPhoneError(text: string): string | null {
  if (!containsFrenchMobile(text)) return null;
  return "Les numéros de portable sont refusés. Posez vos questions ici : la négociation reste sur la plateforme.";
}
