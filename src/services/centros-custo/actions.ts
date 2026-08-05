"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireEscrita } from "@/lib/permissoes";
import { requireSessao } from "@/lib/sessao";
import type { FormularioCentroCusto } from "@/services/centros-custo/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  requireEscrita(sessao);
  return sessao.empresaAtiva.id;
}

export async function criarCentroCusto(dados: FormularioCentroCusto) {
  const empresaId = await obterEmpresa();
  await db.centroCusto.create({ data: { empresaId, nome: dados.nome, cor: dados.cor } });
  revalidatePath("/centros-custo");
}

export async function editarCentroCusto(id: string, dados: FormularioCentroCusto) {
  const empresaId = await obterEmpresa();
  await db.centroCusto.update({ where: { id, empresaId }, data: { nome: dados.nome, cor: dados.cor } });
  revalidatePath("/centros-custo");
}

export async function excluirCentroCusto(id: string) {
  const empresaId = await obterEmpresa();
  await db.centroCusto.update({ where: { id, empresaId }, data: { ativo: false } });
  revalidatePath("/centros-custo");
}
