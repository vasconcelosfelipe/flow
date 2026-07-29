"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSessao } from "@/lib/sessao";
import type { PapelMembro } from "@/types/dominio";

async function verificarAdmin() {
  const sessao = await requireSessao();
  if (!sessao.usuario.adminPlataforma) throw new Error("Não autorizado");
  return sessao;
}

export async function atribuirEmpresa(
  userId: string,
  empresaId: string,
  papel: PapelMembro,
) {
  await verificarAdmin();

  await db.membroEmpresa.upsert({
    where: { empresaId_userId: { empresaId, userId } },
    create: { userId, empresaId, papel },
    update: { papel },
  });

  revalidatePath("/console/usuarios");
}

export async function removerEmpresa(userId: string, empresaId: string) {
  await verificarAdmin();

  await db.membroEmpresa.deleteMany({ where: { userId, empresaId } });
  revalidatePath("/console/usuarios");
}

export async function atualizarPapel(
  userId: string,
  empresaId: string,
  papel: PapelMembro,
) {
  await verificarAdmin();

  await db.membroEmpresa.update({
    where: { empresaId_userId: { empresaId, userId } },
    data: { papel },
  });

  revalidatePath("/console/usuarios");
}
