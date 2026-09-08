/**
 * Client Prisma des tests d'integration, branche sur la base D1 LOCALE
 * (.wrangler/state/v3/d1), la meme que `npm run dev`.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 * Substitue a `@/lib/prisma` par un alias declare dans vitest.config.ts.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getPlatformProxy } from "wrangler";

type D1Binding = ConstructorParameters<typeof PrismaD1>[0];

const proxy = await getPlatformProxy<{ DB: D1Binding }>();
if (!proxy.env?.DB) {
  throw new Error("Binding D1 `DB` introuvable. Lancez `npm run db:migrate` puis `npm run db:seed`.");
}

export const prisma = new PrismaClient({ adapter: new PrismaD1(proxy.env.DB) });
export const disposePlatformProxy = () => proxy.dispose();
