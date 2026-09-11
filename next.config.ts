import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: dir,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Le linter ne signale plus que de vrais oublis : il peut bloquer aussi.
  eslint: { ignoreDuringBuilds: false },
  /*
   * Le typage bloque la construction, il ne la commente plus.
   *
   * `ignoreBuildErrors` a laisse passer six erreurs en production, dont un
   * `export { X } from "..."` qui republie sans importer : la ReferenceError
   * etait avalee par un try/catch et les emplacements de pieces n'etaient
   * jamais crees, sans la moindre alerte. Un deploiement rate vaut mieux
   * qu'une fonction silencieusement morte.
   */
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-d1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

// SKIP_CLOUDFLARE_DEV=1 : next dev sans proxy Wrangler (vitrine locale).
if (process.env.NODE_ENV === "development" && process.env.SKIP_CLOUDFLARE_DEV !== "1") {
  void import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
