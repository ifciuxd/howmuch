import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { db } from "@/database/client";
import { env } from "@/lib/env";
import { assignUsernameIfMissing, promoteIfAdminEmail } from "@/services/account-hooks";

/**
 * Auth.js configuration.
 *
 * - Google OAuth when GOOGLE_CLIENT_ID/SECRET are set
 * - Email magic links (SMTP via EMAIL_SERVER; without it, links are logged in development)
 * - Dev login (any email, no password) only when AUTH_DEV_LOGIN=true and NODE_ENV !== production
 *
 * Sessions are JWTs (required for the dev credentials provider); the user row is
 * re-read from the database on every request, so bans and role changes apply immediately.
 */

function providers(): Provider[] {
  const list: Provider[] = [];
  if (env.googleAuthEnabled) {
    list.push(Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, allowDangerousEmailAccountLinking: true }));
  }
  if (env.emailServer) {
    list.push(Nodemailer({ server: env.emailServer, from: env.emailFrom }));
  } else if (!env.isProduction) {
    list.push({
      id: "nodemailer",
      type: "email",
      name: "Email",
      from: env.emailFrom,
      maxAge: 24 * 60 * 60,
      async sendVerificationRequest({ identifier, url }) {
        console.info(`\n[auth] Magic link for ${identifier}:\n${url}\n`);
      },
    });
  }
  if (env.devLoginEnabled) {
    list.push(
      Credentials({
        id: "dev",
        name: "Dev login",
        credentials: { email: { label: "Email", type: "email" } },
        async authorize(credentials) {
          const email = String(credentials?.email ?? "").trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+$/.test(email)) return null;
          const user =
            (await db.user.findUnique({ where: { email } })) ??
            (await db.user.create({ data: { email, emailVerified: new Date(), name: email.split("@")[0] } }));
          return { id: user.id, email: user.email, name: user.name };
        },
      }),
    );
  }
  return list;
}

export const authConfig: NextAuthConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db as any),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  secret: env.authSecret,
  trustHost: true,
  providers: providers(),
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
    error: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = String(token.uid);
      return session;
    },
    async signIn({ user }) {
      if (!user?.id) return true;
      const row = await db.user.findUnique({ where: { id: user.id }, select: { bannedAt: true } });
      return !row?.bannedAt;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await promoteIfAdminEmail(user.id);
      await assignUsernameIfMissing(user.id);
    },
    async createUser({ user }) {
      if (user.id) await assignUsernameIfMissing(user.id);
    },
  },
};

export function availableProviders() {
  return {
    google: env.googleAuthEnabled,
    email: Boolean(env.emailServer) || !env.isProduction,
    emailIsDevConsole: !env.emailServer,
    dev: env.devLoginEnabled,
  };
}
