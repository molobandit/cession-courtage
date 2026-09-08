import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    // Les tests d'integration ouvrent la base D1 locale : pas de parallelisme.
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: {
    alias: [
      // Le module `server-only` interdit l'import hors serveur Next.
      { find: /^server-only$/, replacement: path.resolve(__dirname, "tests/setup/server-only-stub.ts") },
      // Les couches d'acces doivent taper la vraie base D1 locale.
      { find: /^@\/lib\/prisma$/, replacement: path.resolve(__dirname, "tests/setup/prisma-test.ts") },
      // NextAuth ne se charge pas hors runtime Next : les tests fournissent l'acteur.
      { find: /^@\/auth$/, replacement: path.resolve(__dirname, "tests/setup/auth-stub.ts") },
      { find: /^@\//, replacement: path.resolve(__dirname) + "/" },
    ],
  },
});
