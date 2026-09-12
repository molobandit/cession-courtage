/**
 * Retour après connexion ou paiement : uniquement un chemin interne.
 * Sinon un `next` externe ouvrirait une redirection ouverte.
 */
export function safeInternalPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("://") || value.includes("\\")) return null;
  return value;
}

export function withNextQuery(path: string, next: string | null): string {
  if (!next) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}next=${encodeURIComponent(next)}`;
}
