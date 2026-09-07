import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: dir,
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-pg", "pg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

