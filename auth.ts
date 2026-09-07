import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { consumeMagicLinkToken } from "@/lib/auth/magic-link";
import { loginSchema, magicLinkConsumeSchema } from "@/lib/validations/auth";

function toSessionUser(user: {
  id: string;
  email: string;
  fullName: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.fullName ?? user.email,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "E-mail et mot de passe",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;
        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;
        return toSessionUser(user);
      },
    }),
    Credentials({
      id: "magic-link",
      name: "Lien magique",
      credentials: {
        email: { label: "E-mail", type: "email" },
        token: { label: "Jeton", type: "text" },
      },
      authorize: async (raw) => {
        const parsed = magicLinkConsumeSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await consumeMagicLinkToken(parsed.data.email, parsed.data.token);
        if (!user) return null;
        return toSessionUser(user);
      },
    }),
  ],
});
