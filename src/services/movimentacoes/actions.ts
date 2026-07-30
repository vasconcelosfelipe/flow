"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSessao } from "@/lib/sessao";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  return sessao.empresaAtiva.id;
}

export type NovaMovimentacaoInput = {
  descricao: string;
  tipo: "RECEITA" | "DESPESA";
  valorCentavos: number;
  contaId: string;
  categoriaId: string | null;
  status: "PAGO" | "PENDENTE" | "CONCILIADO";
  data: string; // ISO date string YYYY-MM-DD
};

export async function criarMovimentacao(dados: NovaMovimentacaoInput) {
  const empresaId = await obterEmpresa();
  const data = new Date(dados.data);
  await db.movimentacao.create({
    data: {
      empresaId,
      contaId: dados.contaId,
      categoriaId: dados.categoriaId,
      descricao: dados.descricao,
      tipo: dados.tipo,
      valorCentavos: dados.valorCentavos,
      status: dados.status,
      data: dados.status !== "PENDENTE" ? data : null,
      dataVencimento: dados.status === "PENDENTE" ? data : null,
      dataCompetencia: data,
    },
  });
  revalidatePath("/movimentacoes");
  revalidatePath("/");
}

export async function editarMovimentacao(id: string, dados: NovaMovimentacaoInput) {
  const empresaId = await obterEmpresa();
  const data = new Date(dados.data);
  await db.movimentacao.update({
    where: { id, empresaId },
    data: {
      contaId: dados.contaId,
      categoriaId: dados.categoriaId,
      descricao: dados.descricao,
      tipo: dados.tipo,
      valorCentavos: dados.valorCentavos,
      status: dados.status,
      data: dados.status !== "PENDENTE" ? data : null,
      dataVencimento: dados.status === "PENDENTE" ? data : null,
      dataCompetencia: data,
    },
  });
  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
}

export type NovaPendenciaInput = {
  descricao: string;
  tipo: "RECEITA" | "DESPESA";
  valorCentavos: number;
  contaId: string;
  categoriaId: string | null;
  dataVencimento: string; // YYYY-MM-DD
};

export async function criarPendencia(dados: NovaPendenciaInput) {
  const empresaId = await obterEmpresa();
  const venc = new Date(dados.dataVencimento);
  await db.movimentacao.create({
    data: {
      empresaId,
      contaId: dados.contaId,
      categoriaId: dados.categoriaId,
      descricao: dados.descricao,
      tipo: dados.tipo,
      valorCentavos: dados.valorCentavos,
      status: "PENDENTE",
      data: null,
      dataVencimento: venc,
      dataCompetencia: venc,
    },
  });
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
}
