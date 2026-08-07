"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireEscrita } from "@/lib/permissoes";
import { requireSessao } from "@/lib/sessao";
import type { FormularioConta } from "@/services/contas/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  requireEscrita(sessao);
  return sessao.empresaAtiva.id;
}

export async function criarConta(dados: FormularioConta) {
  const empresaId = await obterEmpresa();
  await db.conta.create({
    data: {
      empresaId,
      nome: dados.nome,
      cor: dados.cor,
      tipo: dados.tipo,
      saldoInicial: dados.saldoInicialCentavos,
      diaFechamento: dados.diaFechamento,
      diaVencimentoFatura: dados.diaVencimentoFatura,
    },
  });
  revalidatePath("/contas");
}

export async function editarConta(id: string, dados: FormularioConta) {
  const empresaId = await obterEmpresa();
  await db.conta.update({
    where: { id, empresaId },
    data: {
      nome: dados.nome,
      cor: dados.cor,
      tipo: dados.tipo,
      saldoInicial: dados.saldoInicialCentavos,
      diaFechamento: dados.diaFechamento,
      diaVencimentoFatura: dados.diaVencimentoFatura,
    },
  });
  revalidatePath("/contas");
}

export async function excluirConta(id: string) {
  const empresaId = await obterEmpresa();
  await db.conta.update({ where: { id, empresaId }, data: { ativa: false } });
  revalidatePath("/contas");
}
