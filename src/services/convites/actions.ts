"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * Aceitar convite = a única forma de uma conta nascer no Flow (o Better
 * Auth não expõe cadastro público — ver comentário em `src/lib/auth.ts`).
 * Sem sessão nenhuma no ar ainda, então nada aqui passa por `requireSessao`.
 *
 * Cria a conta via `auth.api.signUpEmail` (mesma API que o Better Auth usa
 * por trás do cadastro), sem `asResponse` — não precisamos do cookie de
 * sessão aqui: depois de aceitar, a pessoa é mandada pro login pra entrar
 * "de verdade", em vez de tentar repassar cookie manualmente de dentro de
 * uma Server Action.
 */
export async function aceitarConvite(token: string, nome: string, senha: string) {
  const convite = await db.convite.findUnique({ where: { token } });
  if (!convite) throw new Error("Convite inválido.");
  if (convite.aceitoEm !== null) throw new Error("Este convite já foi utilizado.");
  if (convite.expiraEm < new Date()) throw new Error("Este convite expirou.");

  const jaTemConta = await db.user.findUnique({ where: { email: convite.email } });
  if (jaTemConta) throw new Error("Já existe uma conta com este e-mail — faça login normalmente.");

  await auth.api.signUpEmail({
    body: { name: nome, email: convite.email, password: senha },
  });
  const novoUsuario = await db.user.findUniqueOrThrow({ where: { email: convite.email } });

  await db.$transaction([
    db.membroEmpresa.create({
      data: { userId: novoUsuario.id, empresaId: convite.empresaId, papel: convite.papel },
    }),
    db.convite.update({ where: { id: convite.id }, data: { aceitoEm: new Date() } }),
  ]);
}
