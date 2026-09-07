import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/app", "/admin"];
const PROTECTED_EXACT = ["/en-attente-orias"];

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: {
    signIn: "/connexion",
    error: "/connexion",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const needsSession =
        PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
        PROTECTED_EXACT.includes(pathname);
      if (!needsSession) return true;
      return Boolean(auth?.user?.id);
    },
  },
} satisfies NextAuthConfig;
