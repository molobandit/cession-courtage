import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: dir,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
