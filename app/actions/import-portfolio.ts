"use server";

import { ImportStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyMapping } from "@/lib/import/apply-mapping";
import {
  IMPORT_BATCH_ROWS,
  LINE_CHUNK,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_LINES,
} from "@/lib/import/constants";
import {
  mappingFromForm,
  mappingIsComplete,
  mappingUsesHeaders,
  suggestColumnMapping,
} from "@/lib/import/mapping";
import { parseUploadedTable } from "@/lib/import/parse-file";
import {
  importStorageKey,
  readImportFile,
  sha256Buffer,
  writeImportFile,
} from "@/lib/import/persist";
import { detectNominativeColumns, piiWarningText } from "@/lib/import/pii";
import { parseFrenchNumber } from "@/lib/import/values";
import type { ColumnMapping } from "@/lib/import/types";
import { idSchema } from "@/lib/validations/actions";
import { sumMoney } from "@/lib/format/money";
import { canSell, getActor, isOriasVerified } from "@/lib/authz/actor";
import { ensureSellerFirm, getMyImport } from "@/lib/authz/imports";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import { valuePortfolio } from "@/lib/valuation/run";

export type ImportFormState = {
  error?: string;
};

/** Retour de la preparation : tout ce dont le navigateur a besoin pour piloter les lots. */
export type ImportPrepareState = {
  error?: string;
  ready?: {
    importId: string;
    portfolioId: string;
    totalRows: number;
    processedRows: number;
  };
};

export type ImportBatchState = {
  error?: string;
  processedRows?: number;
  totalRows?: number;
  done?: boolean;
  skipped?: number;
};

export type ImportFinalizeState = {
  error?: string;
  portfolioId?: string;
};

const ALLOWED_EXT = /\.(csv|xlsx|xls)$/i;

function mimeFor(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  return "text/csv";
}

async function requireImportActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("Votre numéro ORIAS n'a pas encore été validé.");
  if (!canSell(actor)) throw new ForbiddenError("Réservé aux cédants.");
  return actor;
}

function formError(error: unknown): ImportFormState {
  if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
  if (error instanceof ForbiddenError) return { error: error.message };
  if (error instanceof Error) return { error: error.message };
  return { error: "Une erreur est survenue." };
}

export async function uploadPortfolioFileAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  let destination: string | null = null;
  try {
    const actor = await requireImportActor();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choisissez un fichier CSV ou Excel." };
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return { error: "Le fichier dépasse 10 Mo." };
    }
    if (!ALLOWED_EXT.test(file.name)) {
      return { error: "Formats acceptés : CSV, XLSX, XLS." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = sha256Buffer(buffer);
    let table;
    try {
      table = parseUploadedTable(buffer, file.name);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Fichier illisible." };
    }
    if (table.rows.length > MAX_IMPORT_LINES) {
      return { error: `Le fichier dépasse ${MAX_IMPORT_LINES.toLocaleString("fr-FR")} lignes.` };
    }

    const pii = detectNominativeColumns(table.headers, table.rows);
    const importId = crypto.randomUUID();

    if (pii.length > 0) {
      await prisma.portfolioImport.create({
        data: {
          id: importId,
          userId: actor.id,
          originalFileName: file.name,
          storageKey: "deleted",
          sha256,
          mimeType: mimeFor(file.name),
          status: ImportStatus.REJECTED_PII,
          rejectionReason: piiWarningText(pii),
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: "portfolio.import.rejected_pii",
          entityType: "PortfolioImport",
          entityId: importId,
          metadata: { fileName: file.name, columns: pii.map((f) => f.column) },
        },
      });
      destination = `/app/import/${importId}`;
    } else {
      const storageKey = importStorageKey(actor.id, importId, file.name);
      await writeImportFile(storageKey, buffer);
      const mapping = suggestColumnMapping(table.headers);
      await prisma.portfolioImport.create({
        data: {
          id: importId,
          userId: actor.id,
          originalFileName: file.name,
          storageKey,
          sha256,
          mimeType: mimeFor(file.name),
          status: ImportStatus.MAPPED,
          columnMapping: mapping,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: "portfolio.import.uploaded",
          entityType: "PortfolioImport",
          entityId: importId,
          metadata: { fileName: file.name, sha256, rows: table.rows.length, encoding: table.encoding },
        },
      });
      destination = `/app/import/${importId}`;
    }
  } catch (error) {
    return formError(error);
  }
  if (!destination) return { error: "Import impossible." };
  redirect(destination);
}

export async function saveColumnMappingAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  try {
    const actor = await requireImportActor();
    const importId = String(formData.get("importId") ?? "");
    const record = await getMyImport(importId, actor);
    if (record.status === ImportStatus.REJECTED_PII) {
      return { error: "Ce fichier a été refusé. Déposez un bordereau anonymisé." };
    }
    if (record.status === ImportStatus.COMPLETED) {
      return { error: "Cet import est déjà terminé." };
    }
    const mapping = mappingFromForm(formData);
    await prisma.portfolioImport.update({
      where: { id: record.id },
      data: { columnMapping: mapping, status: ImportStatus.MAPPED },
    });
    revalidatePath(`/app/import/${record.id}`);
    const incomplete = mappingIsComplete(mapping);
    if (incomplete) return { error: incomplete };
    return {};
  } catch (error) {
    return formError(error);
  }
}

function parseChurnPercent(raw: string): string | ImportFormState {
  const trimmed = raw.trim();
  if (!trimmed) return "0.0000";
  const n = parseFrenchNumber(trimmed);
  if (n == null || n < 0 || n > 100) {
    return { error: "Le taux de résiliation 12 mois doit être compris entre 0 et 100 %." };
  }
  return (n / 100).toFixed(4);
}

/**
 * Prépare l'import : valide la correspondance, crée le portefeuille, enregistre
 * le nombre total de lignes. L'insertion elle-même est faite par lots, ensuite.
 *
 * Mesuré sur la base locale : environ 2 ms par ligne, soit près de deux minutes
 * pour 50 000 lignes. Une seule requête ne peut pas tenir cette durée, d'où le
 * découpage piloté par le navigateur.
 */
export async function confirmPortfolioImportAction(
  _prev: ImportPrepareState,
  formData: FormData,
): Promise<ImportPrepareState> {
  try {
    const actor = await requireImportActor();
    const withFirm = await ensureSellerFirm(actor);
    if (!withFirm.firmId) return { error: "Impossible d'associer un cabinet à cet import." };

    const importId = String(formData.get("importId") ?? "");
    const record = await getMyImport(importId, withFirm);
    if (record.status === ImportStatus.REJECTED_PII) {
      return { error: "Ce fichier a été refusé : retirez les colonnes nominatives puis réimportez." };
    }
    if (record.status === ImportStatus.COMPLETED) {
      return { error: "Cet import est déjà terminé." };
    }
    if (record.storageKey === "deleted") {
      return { error: "Le fichier n'est plus disponible." };
    }

    const mapping = mappingFromForm(formData);
    const incomplete = mappingIsComplete(mapping);
    if (incomplete) return { error: incomplete };

    const labelRaw = String(formData.get("label") ?? "").trim();
    const label =
      labelRaw ||
      record.originalFileName.replace(/\.(csv|xlsx|xls)$/i, "").slice(0, 120) ||
      "Portefeuille importé";

    const churn = parseChurnPercent(String(formData.get("churnRate12m") ?? ""));
    if (typeof churn !== "string") return churn;

    let buffer: Buffer;
    try {
      buffer = await readImportFile(record.storageKey);
    } catch {
      return { error: "Le fichier déposé est introuvable. Réimportez-le." };
    }

    const table = parseUploadedTable(buffer, record.originalFileName);
    if (!mappingUsesHeaders(mapping, table.headers)) {
      return { error: "La correspondance fait référence à une colonne absente du fichier." };
    }
    if (table.rows.length > MAX_IMPORT_LINES) {
      return { error: `Le fichier dépasse ${MAX_IMPORT_LINES.toLocaleString("fr-FR")} lignes.` };
    }

    // Un import déjà préparé se reprend sur son portefeuille, sans doublon.
    const portfolio =
      record.portfolioId !== null
        ? await prisma.portfolio.findUnique({ where: { id: record.portfolioId } })
        : await prisma.portfolio.create({
            data: {
              firmId: withFirm.firmId,
              label,
              contractCount: 0,
              clientCount: 0,
              annualCommissions: "0.00",
              averageAgeMonths: 0,
              churnRate12m: churn,
              sourceFileName: record.originalFileName,
              sourceStorageKey: record.storageKey,
              sourceSha256: record.sha256,
            },
          });
    if (!portfolio) return { error: "Portefeuille introuvable. Réimportez le fichier." };

    await prisma.portfolioImport.update({
      where: { id: record.id },
      data: {
        columnMapping: mapping,
        status: ImportStatus.MAPPED,
        portfolioId: portfolio.id,
        totalRows: table.rows.length,
      },
    });

    return {
      ready: {
        importId: record.id,
        portfolioId: portfolio.id,
        totalRows: table.rows.length,
        processedRows: record.processedRows,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: "Préparation impossible. Vérifiez le fichier puis réessayez." };
    }
    return formError(error);
  }
}

/**
 * Insère une tranche de lignes et renvoie l'avancement.
 *
 * Rejouable : les identifiants de ligne dérivent du rang dans le fichier, donc
 * un lot relancé après une coupure écrase les mêmes lignes au lieu d'en créer
 * de nouvelles. C'est ce qui permet la reprise sans transaction.
 */
export async function importBatchAction(importId: string): Promise<ImportBatchState> {
  try {
    const parsed = idSchema.safeParse(importId);
    if (!parsed.success) return { error: "Identifiant d’import invalide." };
    const actor = await requireImportActor();
    // getMyImport verifie l'appartenance : un identifiant devine ne donne rien.
    const record = await getMyImport(parsed.data, actor);
    if (!record.portfolioId) return { error: "Import non préparé." };
    if (record.status === ImportStatus.COMPLETED) {
      return { processedRows: record.totalRows, totalRows: record.totalRows, done: true };
    }
    if (record.storageKey === "deleted") return { error: "Le fichier n'est plus disponible." };

    const mapping = record.columnMapping as ColumnMapping | null;
    if (!mapping) return { error: "Correspondance des colonnes absente." };

    const buffer = await readImportFile(record.storageKey);
    const table = parseUploadedTable(buffer, record.originalFileName);

    const offset = record.processedRows;
    const slice = table.rows.slice(offset, offset + IMPORT_BATCH_ROWS);
    if (slice.length === 0) {
      return { processedRows: record.totalRows, totalRows: record.totalRows, done: true };
    }

    const mapped = applyMapping(table.headers, slice, mapping, record.portfolioId, offset);

    for (let i = 0; i < mapped.lines.length; i += LINE_CHUNK) {
      const chunk = mapped.lines.slice(i, i + LINE_CHUNK);
      // Rejeu possible : on efface la tranche avant de la réécrire.
      await prisma.contractLine.deleteMany({
        where: { id: { in: chunk.map((line) => String(line.id)) } },
      });
      await prisma.contractLine.createMany({ data: chunk });
    }

    const processedRows = offset + slice.length;
    await prisma.portfolioImport.update({
      where: { id: record.id },
      data: { processedRows },
    });

    return {
      processedRows,
      totalRows: record.totalRows,
      done: processedRows >= record.totalRows,
      skipped: mapped.errors.length,
    };
  } catch (error) {
    return formError(error) as ImportBatchState;
  }
}

/** Consolide les agrégats une fois toutes les lignes posées, puis valorise. */
export async function finalizeImportAction(importId: string): Promise<ImportFinalizeState> {
  try {
    const parsed = idSchema.safeParse(importId);
    if (!parsed.success) return { error: "Identifiant d’import invalide." };
    const actor = await requireImportActor();
    const record = await getMyImport(parsed.data, actor);
    if (!record.portfolioId) return { error: "Import non préparé." };

    const portfolioId = record.portfolioId;
    const lines = await prisma.contractLine.findMany({
      where: { portfolioId },
      select: { clientKey: true, annualCommission: true, effectiveDate: true },
    });
    if (lines.length === 0) {
      return { error: "Aucune ligne valide n'a pu être enregistrée." };
    }

    const now = Date.now();
    const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
    const ages = lines.map((line) => Math.max(0, (now - line.effectiveDate.getTime()) / MONTH_MS));
    const averageAgeMonths = Math.round(ages.reduce((s, a) => s + a, 0) / ages.length);

    await prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        contractCount: lines.length,
        clientCount: new Set(lines.map((line) => line.clientKey)).size,
        annualCommissions: sumMoney(lines.map((line) => Number(line.annualCommission))).toFixed(2),
        averageAgeMonths,
      },
    });
    await prisma.portfolioImport.update({
      where: { id: record.id },
      data: { status: ImportStatus.COMPLETED, completedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "portfolio.import.completed",
        entityType: "Portfolio",
        entityId: portfolioId,
        metadata: { importId: record.id, contractCount: lines.length },
      },
    });

    try {
      await valuePortfolio(portfolioId);
    } catch {
      // La valorisation est dérivée : l'import lui-même a réussi.
    }

    revalidatePath("/app");
    revalidatePath(`/app/portefeuilles/${portfolioId}`);
    return { portfolioId };
  } catch (error) {
    return formError(error) as ImportFinalizeState;
  }
}
