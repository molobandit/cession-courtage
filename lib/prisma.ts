import "server-only";
import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isCloudflareWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

function createPrismaClient(): PrismaClient {
  if (isCloudflareWorker()) {
    const { env } = getCloudflareContext();
    return new PrismaClient({
      adapter: new PrismaD1((env as { DB: ConstructorParameters<typeof PrismaD1>[0] }).DB),
      log: ["error"],
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const prismaForRequest = cache(createPrismaClient);

function client(): PrismaClient {
  if (isCloudflareWorker()) {
    return prismaForRequest();
  }
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

/** Proxy : un client par requête sur Worker (binding D1), singleton en `next dev`. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const instance = client();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
