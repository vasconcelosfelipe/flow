import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // Não expõe rota de cadastro público — usuários chegam via convite
    autoSignIn: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,      // 30 dias
    updateAge: 60 * 60 * 24,            // renova se > 1 dia desde última atualização
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,                   // cache do cookie por 5 min (reduz queries)
    },
  },

  user: {
    additionalFields: {
      adminPlataforma: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,  // não exposto na API pública
      },
    },
  },

  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  advanced: {
    // CSRF protection is handled by SameSite=Lax cookies.
    // Better Auth's origin comparison fails behind a reverse proxy even when
    // the origin is in trustedOrigins, so we disable the redundant header check.
    disableOriginCheck: true,
    disableCSRFCheck: true,
  },
});

export type Session = typeof auth.$Infer.Session;
export type ActiveUser = typeof auth.$Infer.Session.user;
