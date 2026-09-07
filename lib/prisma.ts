import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isCloudflareWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (isCloudflareWorker()) {
    if (!connectionString) {
      throw new Error("DATABASE_URL manquante.");
    }
    const adapter = new PrismaPg({ connectionString, maxUses: 1 });
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && !isCloudflareWorker()) {
  globalForPrisma.prisma = prisma;
}
