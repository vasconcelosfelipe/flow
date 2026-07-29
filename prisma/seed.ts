/**
 * Seed inicial: cria o admin da plataforma se não existir.
 *
 * Uso na VPS:
 *   DATABASE_URL=... BETTER_AUTH_SECRET=... npx tsx prisma/seed.ts
 *
 * Variáveis obrigatórias:
 *   SEED_ADMIN_EMAIL  — e-mail do primeiro admin
 *   SEED_ADMIN_SENHA  — senha (mín. 8 caracteres)
 *   SEED_ADMIN_NOME   — nome de exibição
 */

import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";

const email = process.env.SEED_ADMIN_EMAIL;
const senha = process.env.SEED_ADMIN_SENHA;
const nome  = process.env.SEED_ADMIN_NOME ?? "Admin";

if (!email || !senha) {
  console.error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_SENHA.");
  process.exit(1);
}

const existente = await db.user.findUnique({ where: { email } });
if (existente) {
  console.log(`Usuário ${email} já existe — nada a fazer.`);
  process.exit(0);
}

// Cria via Better Auth para que a senha seja hashada corretamente
await auth.api.signUpEmail({
  body: { email, password: senha, name: nome },
  asResponse: false,
});

// Marca como admin da plataforma
await db.user.update({
  where: { email },
  data: { adminPlataforma: true },
});

console.log(`Admin criado: ${nome} <${email}>`);
process.exit(0);
