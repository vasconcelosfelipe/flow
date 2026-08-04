"use server";

import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { COOKIE_EMPRESA_ATIVA } from "@/lib/empresa-cookie";

/**
 * Grava qual empresa fica ativa nas próximas requisições — `requireSessao()`
 * lê este cookie pra resolver `empresaAtiva`. Sem isso, a escolha nunca
 * persistia: layout não recebe `searchParams`, então uma query string na URL
 * nunca chegava a lugar nenhum.
 */
export async function selecionarEmpresa(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");

  // Confirma que o usuário é membro desta empresa antes de gravar — sem
  // isso, um slug arbitrário trocaria pra empresa alheia.
  const membro = await db.membroEmpresa.findFirst({
    where: { userId: session.user.id, empresa: { slug } },
  });
  if (!membro) throw new Error("Você não tem acesso a esta empresa.");

  const store = await cookies();
  store.set(COOKIE_EMPRESA_ATIVA, slug, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
