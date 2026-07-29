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

export async function criarEmpresa(dados: { nome: string; slug: string; cnpj?: string | null }) {
  const sessao = await verificarAdmin();
  const empresa = await db.empresa.create({ data: { nome: dados.nome, slug: dados.slug, cnpj: dados.cnpj } });
  // Auto-atribui o admin criador como ADMIN da empresa
  await db.membroEmpresa.create({ data: { userId: sessao.usuario.id, empresaId: empresa.id, papel: "ADMIN" } });
  revalidatePath("/console/empresas");
}

export async function editarEmpresa(id: string, dados: { nome: string; slug: string; cnpj?: string | null }) {
  await verificarAdmin();
  await db.empresa.update({ where: { id }, data: { nome: dados.nome, slug: dados.slug, cnpj: dados.cnpj } });
  revalidatePath("/console/empresas");
}

export async function alternarEmpresaAtiva(id: string) {
  await verificarAdmin();
  const empresa = await db.empresa.findUniqueOrThrow({ where: { id }, select: { ativa: true } });
  await db.empresa.update({ where: { id }, data: { ativa: !empresa.ativa } });
  revalidatePath("/console/empresas");
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
