/** Jeton interne : D1 impose oriasNumber NOT NULL. Jamais affiché. */
export function investorOriasPlaceholder(publicAlias: string): string {
  return `__INV__${publicAlias}`;
}
