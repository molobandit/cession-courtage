export type OriasLookupStatus = "MATCH" | "MISMATCH" | "NOT_FOUND" | "UNAVAILABLE" | "INVALID";

export type OriasLookupInput = {
  oriasNumber: string;
  legalName?: string | null;
  siren?: string | null;
};

export type OriasLookupResult = {
  status: OriasLookupStatus;
  registerName: string | null;
  registerSiren: string | null;
  detail: string;
};

export function normalizeOriasNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
}

export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\b(sas|sarl|sa|sci|eurl|snc|selarl|selas)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function namesAlign(declared: string | null | undefined, found: string | null): boolean {
  if (!declared || !found) return true;
  const a = foldName(declared);
  const b = foldName(found);
  if (!a || !b) return true;
  return a.includes(b) || b.includes(a);
}

export function sirensAlign(declared: string | null | undefined, found: string | null): boolean {
  if (!declared || !found) return true;
  return declared.replace(/\D/g, "") === found.replace(/\D/g, "");
}

type RegisterHit = { legalName: string | null; siren: string | null };

/**
 * Consulte le registre public. En cas d'indisponibilité, UNAVAILABLE :
 * l'administrateur tranche, l'automatisation ne valide jamais.
 */
export async function lookupOriasRegister(
  input: OriasLookupInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OriasLookupResult> {
  const numero = normalizeOriasNumber(input.oriasNumber);
  if (!numero) {
    return {
      status: "INVALID",
      registerName: null,
      registerSiren: null,
      detail: "Le numéro ORIAS doit compter huit chiffres.",
    };
  }

  let hit: RegisterHit | null | undefined;
  try {
    hit = await queryRegister(numero, fetchImpl);
  } catch {
    return {
      status: "UNAVAILABLE",
      registerName: null,
      registerSiren: null,
      detail: "Le registre public n’a pas répondu. Décision humaine requise.",
    };
  }

  if (hit === undefined) {
    return {
      status: "UNAVAILABLE",
      registerName: null,
      registerSiren: null,
      detail: "Le registre public n’a pas renvoyé un résultat exploitable.",
    };
  }
  if (hit === null) {
    return {
      status: "NOT_FOUND",
      registerName: null,
      registerSiren: null,
      detail: `Aucun intermédiaire n’est publié pour le numéro ${numero}.`,
    };
  }

  const nameOk = namesAlign(input.legalName, hit.legalName);
  const sirenOk = sirensAlign(input.siren, hit.siren);
  if (!nameOk || !sirenOk) {
    return {
      status: "MISMATCH",
      registerName: hit.legalName,
      registerSiren: hit.siren,
      detail: "Le registre répond, mais la raison sociale ou le SIREN ne correspondent pas à la déclaration.",
    };
  }
  return {
    status: "MATCH",
    registerName: hit.legalName,
    registerSiren: hit.siren,
    detail: "Le numéro figure au registre et correspond à la société déclarée.",
  };
}

async function queryRegister(numero: string, fetchImpl: typeof fetch): Promise<RegisterHit | null | undefined> {
  const url = `https://www.orias.fr/ifpwcs_es/rest/recherche/findByNumeroInscription/${numero}`;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (response.status === 404) return null;
  if (!response.ok) return undefined;
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    const data = JSON.parse(text) as {
      denomination?: string;
      raisonSociale?: string;
      siren?: string;
      numeroSiren?: string;
    };
    const legalName = data.denomination ?? data.raisonSociale ?? null;
    const siren = data.siren ?? data.numeroSiren ?? null;
    if (!legalName && !siren) return undefined;
    return { legalName, siren };
  } catch {
    return undefined;
  }
}
