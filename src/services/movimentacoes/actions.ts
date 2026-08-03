"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSessao } from "@/lib/sessao";
import { listarMovimentacoes } from "@/services/movimentacoes";
import type { FiltroMovimentacoes } from "@/services/movimentacoes/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  return sessao.empresaAtiva.id;
}

/** Próxima página da lista de movimentações — mesma consulta da tela, só com cursor. */
export async function buscarMaisMovimentacoes(filtro: FiltroMovimentacoes, cursor: string) {
  const empresaId = await obterEmpresa();
  return listarMovimentacoes(empresaId, filtro, cursor);
}

export type NovaMovimentacaoInput = {
  descricao: string;
  tipo: "RECEITA" | "DESPESA";
  valorCentavos: number;
  contaId: string;
  categoriaId: string | null;
  contatoId: string | null;
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
      contatoId: dados.contatoId,
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
  const atual = await db.movimentacao.findUniqueOrThrow({ where: { id, empresaId } });
  await db.movimentacao.update({
    where: { id, empresaId },
    data: {
      contaId: dados.contaId,
      categoriaId: dados.categoriaId,
      contatoId: dados.contatoId,
      descricao: dados.descricao,
      tipo: dados.tipo,
      valorCentavos: dados.valorCentavos,
      status: dados.status,
      data: dados.status !== "PENDENTE" ? data : null,
      dataVencimento: dados.status === "PENDENTE" ? data : null,
      dataCompetencia: data,
      // Tirar do status Conciliado por edição direta desliga o vínculo com o
      // extrato — senão a linha do OFX fica "já importada" pra sempre, mesmo
      // sem nenhuma movimentação conciliada de verdade pra ela.
      ...(atual.status === "CONCILIADO" && dados.status !== "CONCILIADO"
        ? { origemFitId: null }
        : {}),
    },
  });
  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
}

/**
 * Excluir é sempre um "esconder": marca como cancelada em vez de apagar a
 * linha do banco. Preserva histórico (auditoria, extrato de importação) e
 * evita violar a referência de `ImportacaoLinha`, que aponta pra esta
 * movimentação quando ela veio de um OFX.
 *
 * Uma movimentação conciliada está casada com uma linha do extrato
 * importado — excluí-la direto apagaria essa conciliação sem avisar.
 * Por isso é bloqueado até a pessoa desfazer a conciliação primeiro.
 *
 * Uma perna de transferência nunca some sozinha — cancela o par inteiro,
 * senão o dinheiro "some" de uma conta sem nunca ter "chegado" na outra.
 */
export async function excluirMovimentacao(id: string) {
  const empresaId = await obterEmpresa();
  const mov = await db.movimentacao.findUniqueOrThrow({ where: { id, empresaId } });
  if (mov.status === "CONCILIADO") {
    throw new Error("Desfaça a conciliação antes de excluir esta movimentação.");
  }
  if (mov.transferenciaId) {
    await db.movimentacao.updateMany({
      where: { empresaId, transferenciaId: mov.transferenciaId },
      data: { status: "CANCELADO", origemFitId: null },
    });
  } else {
    await db.movimentacao.update({
      where: { id, empresaId },
      data: { status: "CANCELADO", origemFitId: null },
    });
  }
  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
}

export type NovaTransferenciaInput = {
  contaOrigemId: string;
  contaDestinoId: string;
  valorCentavos: number;
  data: string; // ISO date string YYYY-MM-DD
  descricao?: string;
};

/**
 * Transferência vira duas movimentações ligadas por `transferenciaId`: uma
 * DESPESA na conta de origem, uma RECEITA na de destino. Nenhuma categoria
 * nem contato — não é receita nem despesa de verdade, é o mesmo dinheiro
 * mudando de bolso, e fica fora da DRE por não apontar pra nenhuma linha.
 */
export async function criarTransferencia(dados: NovaTransferenciaInput) {
  const empresaId = await obterEmpresa();
  if (dados.contaOrigemId === dados.contaDestinoId) {
    throw new Error("Escolha duas contas diferentes para a transferência.");
  }

  const [origem, destino] = await Promise.all([
    db.conta.findFirstOrThrow({ where: { id: dados.contaOrigemId, empresaId } }),
    db.conta.findFirstOrThrow({ where: { id: dados.contaDestinoId, empresaId } }),
  ]);

  const data = new Date(dados.data);
  const transferenciaId = crypto.randomUUID();
  const descricaoOrigem = dados.descricao?.trim() || `Transferência para ${destino.nome}`;
  const descricaoDestino = dados.descricao?.trim() || `Transferência de ${origem.nome}`;

  await db.$transaction([
    db.movimentacao.create({
      data: {
        empresaId,
        contaId: dados.contaOrigemId,
        descricao: descricaoOrigem,
        tipo: "DESPESA",
        valorCentavos: dados.valorCentavos,
        status: "PAGO",
        data,
        dataCompetencia: data,
        transferenciaId,
      },
    }),
    db.movimentacao.create({
      data: {
        empresaId,
        contaId: dados.contaDestinoId,
        descricao: descricaoDestino,
        tipo: "RECEITA",
        valorCentavos: dados.valorCentavos,
        status: "PAGO",
        data,
        dataCompetencia: data,
        transferenciaId,
      },
    }),
  ]);

  revalidatePath("/movimentacoes");
  revalidatePath("/");
}

/**
 * Desfaz o casamento com o extrato importado. Sempre limpa `origemFitId` —
 * sem isso a linha do OFX fica marcada como "já importada" pra sempre e uma
 * reimportação do mesmo arquivo nunca mais consegue conciliar de novo.
 *
 * Se a movimentação nasceu como pendência (tem `dataVencimento`), volta
 * inteira pro estado de pendência aberta — é o estado de antes de ter sido
 * casada por um import. Se nasceu direto de uma linha "NOVA" do OFX (sem
 * pendência original), não existe estado anterior pra restaurar: só solta o
 * vínculo com o extrato e mantém "paga" — reimportar depois disso cria uma
 * linha nova em vez de reconciliar.
 */
export async function desfazerConciliacao(id: string) {
  const empresaId = await obterEmpresa();
  const mov = await db.movimentacao.findUniqueOrThrow({ where: { id, empresaId } });
  await db.movimentacao.update({
    where: { id, empresaId },
    data: mov.dataVencimento
      ? { status: "PENDENTE", data: null, origemFitId: null }
      : { status: "PAGO", origemFitId: null },
  });
  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
}

/** Categoriza várias movimentações de uma vez — a lista pode misturar RECEITA e DESPESA. */
export async function atualizarCategoriaEmLote(ids: string[], categoriaId: string | null) {
  const empresaId = await obterEmpresa();
  await db.movimentacao.updateMany({
    where: { id: { in: ids }, empresaId },
    data: { categoriaId },
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
  contatoId: string | null;
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
      contatoId: dados.contatoId,
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
