"use server";

import { revalidatePath } from "next/cache";
import { addDays, addMonths } from "date-fns";

import { db } from "@/lib/db";
import { calcularVencimentoFatura } from "@/lib/dates";
import { requireEscrita } from "@/lib/permissoes";
import { requireSessao } from "@/lib/sessao";
import { listarMovimentacoes } from "@/services/movimentacoes";
import type { FiltroMovimentacoes } from "@/services/movimentacoes/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  return sessao.empresaAtiva.id;
}

// `obterEmpresa()` também serve leitura (`buscarMaisMovimentacoes`, usada por
// LEITOR) — por isso o gate de escrita vive num helper à parte, chamado só
// pelas mutações abaixo.
async function obterEmpresaEscrita() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  requireEscrita(sessao);
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
  const empresaId = await obterEmpresaEscrita();
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
  const empresaId = await obterEmpresaEscrita();
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
  const empresaId = await obterEmpresaEscrita();
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
  const empresaId = await obterEmpresaEscrita();
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
  const empresaId = await obterEmpresaEscrita();
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
  const empresaId = await obterEmpresaEscrita();
  await db.movimentacao.updateMany({
    where: { id: { in: ids }, empresaId },
    data: { categoriaId },
  });
  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
}

export type EditarGrupoParcelamentoInput = {
  descricao: string;
  tipo: "RECEITA" | "DESPESA";
  categoriaId: string | null;
  contatoId: string | null;
  contaId: string;
  /** Diferença (em dias) entre a nova e a antiga data da parcela que
   * originou a edição — desloca a série mantendo o intervalo entre
   * parcelas, em vez de igualar todas à mesma data. */
  deltaDias: number;
};

/**
 * Propaga uma edição pro resto do grupo (as outras parcelas/ocorrências
 * que nasceram junto, ver `grupoParcelamento`) — chamada só quando a
 * pessoa marca "aplicar a todas" ao editar uma parcela. A parcela que
 * originou a edição já foi salva por `editarMovimentacao` antes desta
 * chamada, por isso fica de fora (`excetoId`).
 *
 * Valor e status nunca são propagados: parcela pode ter valor diferente
 * por design (juros, arredondamento — ver `NovaPendenciaInput`), e status
 * mistura PAGO/PENDENTE/CONCILIADO dentro do mesmo grupo por natureza.
 *
 * Data conciliada está casada com o extrato bancário real — deslocá-la
 * quebraria a conciliação sem avisar, mesma razão que já bloqueia
 * exclusão de conciliado — por isso o deslocamento pula quem está
 * CONCILIADO (os outros campos ainda são atualizados nela).
 */
export async function editarGrupoParcelamento(
  grupoParcelamento: string,
  excetoId: string,
  dados: EditarGrupoParcelamentoInput,
) {
  const empresaId = await obterEmpresaEscrita();
  const membros = await db.movimentacao.findMany({
    where: { empresaId, grupoParcelamento, id: { not: excetoId }, status: { not: "CANCELADO" } },
  });

  await db.$transaction(
    membros.map((m) =>
      db.movimentacao.update({
        where: { id: m.id },
        data: {
          descricao: dados.descricao,
          tipo: dados.tipo,
          categoriaId: dados.categoriaId,
          contatoId: dados.contatoId,
          contaId: dados.contaId,
          ...(dados.deltaDias !== 0 && m.status !== "CONCILIADO"
            ? {
                data: m.data ? addDays(m.data, dados.deltaDias) : null,
                dataVencimento: m.dataVencimento ? addDays(m.dataVencimento, dados.deltaDias) : null,
                dataCompetencia: addDays(m.dataCompetencia, dados.deltaDias),
              }
            : {}),
        },
      }),
    ),
  );

  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
}

/**
 * Exclui (cancela) todas as parcelas/ocorrências de um grupo de uma vez.
 * Mesma regra do `excluirMovimentacao` de hoje (bloqueia conciliado), mas
 * em vez de travar tudo por causa de uma parcela conciliada, pula só ela
 * e devolve a contagem — com dezenas de parcelas não faz sentido travar a
 * exclusão inteira por 1 ou 2 já conciliadas.
 */
export async function excluirGrupoParcelamento(grupoParcelamento: string) {
  const empresaId = await obterEmpresaEscrita();
  const totalElegivel = await db.movimentacao.count({
    where: { empresaId, grupoParcelamento, status: { not: "CANCELADO" } },
  });
  const resultado = await db.movimentacao.updateMany({
    where: { empresaId, grupoParcelamento, status: { not: "CONCILIADO" } },
    data: { status: "CANCELADO", origemFitId: null },
  });

  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");
  return { excluidas: resultado.count, puladas: totalElegivel - resultado.count };
}

type CamposComunsPendencia = {
  descricao: string;
  tipo: "RECEITA" | "DESPESA";
  contaId: string;
  categoriaId: string | null;
  contatoId: string | null;
  /** YYYY-MM-DD — vencimento da 1ª ocorrência/parcela; numa conta CARTAO,
   * é a data da compra, não o vencimento (esse é calculado). */
  dataVencimento: string;
};

/**
 * Três modalidades de ocorrência:
 * - `UNICA`: um título, um vencimento, fim.
 * - `PARCELADO`: N títulos, um por mês a partir do vencimento informado. O
 *   valor de cada parcela vem editado do formulário — pode não bater com
 *   nenhuma divisão igual do valor total, e isso é intencional (parcelas com
 *   juros, arredondamento diferente etc.). A soma das parcelas nunca é
 *   recalculada aqui, só persistida como veio.
 * - `RECORRENTE`: N títulos idênticos, um por mês a partir do vencimento
 *   informado — mesma conta a se repetir por N meses, sem parcelamento de
 *   valor.
 */
export type NovaPendenciaInput =
  | (CamposComunsPendencia & { modalidade: "UNICA"; valorCentavos: number })
  | (CamposComunsPendencia & { modalidade: "PARCELADO"; parcelas: number[] })
  | (CamposComunsPendencia & { modalidade: "RECORRENTE"; valorCentavos: number; quantidadeMeses: number });

/**
 * Numa conta comum, cada ocorrência nasce `PENDENTE` com `dataVencimento`.
 * Numa conta CARTAO, a compra já é fato consumado pro próprio cartão — nasce
 * `PAGO` com `data` (não `dataVencimento`) igual ao vencimento da fatura do
 * ciclo daquela parcela, calculado a partir do fechamento/vencimento da
 * conta. É isso que faz o saldo do cartão cair na hora e a DRE contar a
 * parcela no mês certo (a DRE agrupa por `data`, não por `dataCompetencia`).
 */
export async function criarPendencia(dados: NovaPendenciaInput) {
  const empresaId = await obterEmpresaEscrita();
  const conta = await db.conta.findFirstOrThrow({ where: { id: dados.contaId, empresaId } });
  const ehCartao = conta.tipo === "CARTAO";

  const dataDigitada = new Date(dados.dataVencimento);
  const dataBase =
    ehCartao && conta.diaFechamento && conta.diaVencimentoFatura
      ? calcularVencimentoFatura(dataDigitada, conta.diaFechamento, conta.diaVencimentoFatura)
      : dataDigitada;

  const base = {
    empresaId,
    contaId: dados.contaId,
    categoriaId: dados.categoriaId,
    contatoId: dados.contatoId,
    descricao: dados.descricao,
    tipo: dados.tipo,
    status: (ehCartao ? "PAGO" : "PENDENTE") as "PAGO" | "PENDENTE",
  };

  const datasPor = (data: Date) =>
    ehCartao ? { data, dataVencimento: null } : { data: null, dataVencimento: data };

  if (dados.modalidade === "UNICA") {
    await db.movimentacao.create({
      data: {
        ...base,
        valorCentavos: dados.valorCentavos,
        ...datasPor(dataBase),
        dataCompetencia: dataBase,
      },
    });
  } else if (dados.modalidade === "PARCELADO") {
    const grupoParcelamento = crypto.randomUUID();
    const totalParcelas = dados.parcelas.length;
    await db.movimentacao.createMany({
      data: dados.parcelas.map((valorCentavos, i) => {
        const venc = addMonths(dataBase, i);
        return {
          ...base,
          valorCentavos,
          ...datasPor(venc),
          dataCompetencia: venc,
          numeroParcela: i + 1,
          totalParcelas,
          grupoParcelamento,
        };
      }),
    });
  } else {
    const grupoParcelamento = crypto.randomUUID();
    await db.movimentacao.createMany({
      data: Array.from({ length: dados.quantidadeMeses }, (_, i) => {
        const venc = addMonths(dataBase, i);
        return {
          ...base,
          valorCentavos: dados.valorCentavos,
          ...datasPor(venc),
          dataCompetencia: venc,
          numeroParcela: i + 1,
          totalParcelas: dados.quantidadeMeses,
          grupoParcelamento,
          recorrente: true,
        };
      }),
    });
  }

  revalidatePath("/a-pagar-receber");
  revalidatePath("/movimentacoes");
  revalidatePath("/");
}
