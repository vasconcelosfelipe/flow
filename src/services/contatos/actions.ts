"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireEscrita } from "@/lib/permissoes";
import { requireSessao } from "@/lib/sessao";
import type { FormularioContato } from "@/services/contatos/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  requireEscrita(sessao);
  return sessao.empresaAtiva.id;
}

export async function criarContato(dados: FormularioContato) {
  const empresaId = await obterEmpresa();
  const contato = await db.contato.create({
    data: { empresaId, nome: dados.nome, tipo: "AMBOS", documento: dados.documento },
  });
  revalidatePath("/contatos");
  return contato;
}

export async function editarContato(id: string, dados: FormularioContato) {
  const empresaId = await obterEmpresa();
  await db.contato.update({ where: { id, empresaId }, data: { nome: dados.nome, documento: dados.documento } });
  revalidatePath("/contatos");
}

export async function excluirContato(id: string) {
  const empresaId = await obterEmpresa();
  await db.contato.update({ where: { id, empresaId }, data: { ativo: false } });
  revalidatePath("/contatos");
}
