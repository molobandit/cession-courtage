/** Libellés publics, sans dièse : le # évoque un réseau social, pas un dossier. */

export function dossierName(publicNumber: number): string {
  return `Dossier n° ${publicNumber}`;
}

export function demandName(publicNumber: number): string {
  return `Demande n° ${publicNumber}`;
}

export function partyName(role: "buyer" | "seller", alias: string): string {
  const clean = alias.replace(/^#/, "").trim();
  return role === "buyer" ? `Acquéreur ${clean}` : `Cédant ${clean}`;
}
