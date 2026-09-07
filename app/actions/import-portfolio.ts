"use server";

import { ImportStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyMapping } from "@/lib/import/apply-mapping";
import { LINE_CHUNK, MAX_IMPORT_BYTES, MAX_IMPORT_LINES } from "@/lib/import/constants";
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
import { canSell, getActor, isOriasVerified } from "@/lib/authz/actor";
import { ensureSellerFirm, getMyImport } from "@/lib/authz/imports";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import { valuePortfolio } from "@/lib/valuation/run";

export type ImportFormState = {
  error?: string;
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

export async function confirmPortfolioImportAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  let destination: string | null = null;
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

    await prisma.portfolioImport.update({
      where: { id: record.id },
      data: { columnMapping: mapping, status: ImportStatus.MAPPED },
    });

    const portfolio = await prisma.portfolio.create({
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

    const mapped = applyMapping(table.headers, table.rows, mapping, portfolio.id);
    if (mapped.lines.length === 0) {
      await prisma.portfolio.delete({ where: { id: portfolio.id } });
      const first = mapped.errors[0];
      return {
        error: first
          ? `Aucune ligne valide. Ligne ${first.row} : ${first.message}`
          : "Aucune ligne valide dans le fichier.",
      };
    }

    try {
      for (let i = 0; i < mapped.lines.length; i += LINE_CHUNK) {
        await prisma.contractLine.createMany({ data: mapped.lines.slice(i, i + LINE_CHUNK) });
      }
    } catch (error) {
      await prisma.portfolio.delete({ where: { id: portfolio.id } });
      throw error;
    }

    const clientCount = new Set(mapped.lines.map((line) => line.clientKey)).size;
    const annualCommissions = mapped.lines.reduce((sum, line) => sum + Number(line.annualCommission), 0);

    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        contractCount: mapped.lines.length,
        clientCount,
        annualCommissions: annualCommissions.toFixed(2),
        averageAgeMonths: mapped.averageAgeMonths,
      },
    });
    await prisma.portfolioImport.update({
      where: { id: record.id },
      data: {
        status: ImportStatus.COMPLETED,
        portfolioId: portfolio.id,
        completedAt: new Date(),
        columnMapping: mapping,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: withFirm.id,
        action: "portfolio.import.completed",
        entityType: "Portfolio",
        entityId: portfolio.id,
        metadata: {
          importId: record.id,
          contractCount: mapped.lines.length,
          skipped: mapped.errors.length,
          warnings: mapped.warnings,
        },
      },
    });
    try {
      await valuePortfolio(portfolio.id);
    } catch {
      // Valuation is derived; the import itself succeeded.
    }
    revalidatePath("/app");
    revalidatePath(`/app/portefeuilles/${portfolio.id}`);
    destination = `/app/portefeuilles/${portfolio.id}`;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: "Enregistrement impossible. Vérifiez le fichier puis réessayez." };
    }
    return formError(error);
  }
  if (!destination) return { error: "Import impossible." };
  redirect(destination);
}
