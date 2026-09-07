import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

function prefixFor(role: UserRole): string {
  if (role === "BUYER") return "A";
  if (role === "ADMIN") return "Z";
  if (role === "BOTH") return "B";
  return "C";
}

export async function allocatePublicAlias(role: UserRole): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const alias = `${prefixFor(role)}${String(randomInt(10, 1000)).padStart(3, "0")}`;
    const exists = await prisma.user.findUnique({ where: { publicAlias: alias } });
    if (!exists) return alias;
  }
  return `${prefixFor(role)}${randomBytes(3).toString("hex")}`.slice(0, 8).toUpperCase();
}
