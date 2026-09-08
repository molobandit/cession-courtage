import "server-only";
import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1Binding = ConstructorParameters<typeof PrismaD1>[0];

/**
 * La base est Cloudflare D1, en local comme en production. En `next dev`, le
 * binding est fourni par initOpenNextCloudflareForDev() (next.config.ts) et les
 * donnees vivent dans .wrangler/state/v3/d1. Il n'existe pas de fichier SQLite
 * de developpement ni de DATABASE_URL.
 */
function createPrismaClient(): PrismaClient {
  const { env } = getCloudflareContext();
  const db = (env as { DB?: D1Binding }).DB;
  if (!db) {
    throw new Error(
      "Binding D1 `DB` introuvable. Verifiez wrangler.jsonc, puis lancez `npm run db:migrate` et `npm run db:seed`.",
    );
  }
  return new PrismaClient({ adapter: new PrismaD1(db), log: ["error"] });
}

/** Un client par requete : le binding D1 n'est pas partageable entre requetes. */
const prismaForRequest = cache(createPrismaClient);

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const instance = prismaForRequest();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
