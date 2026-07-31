"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { parseOfx } from "@/lib/ofx";
import { requireSessao } from "@/lib/sessao";
import { mapearMovimentacao } from "@/services/movimentacoes/index";
import type {
  LinhaImportacao,
  ResultadoConfirmacao,
  ResumoImportacao,
  StatusLinhaImportacao,
} from "@/services/importacao/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  return sessao.empresaAtiva.id;
}

/**
 * Lê o extrato, separa o que é novo do que já existe, e casa o que fecha uma
 * pendência em aberto (mesma conta, mesmo tipo, mesmo valor). Não grava nada
 * ainda — é a base pra tela de revisão decidir o que entra.
 */
export async function processarArquivoOfx(
  conteudo: string,
  nomeArquivo: string,
  contaId: string,
): Promise<ResumoImportacao> {
  const empresaId = await obterEmpresa();
  const conta = await db.conta.findFirstOrThrow({ where: { id: contaId, empresaId } });

  const { transacoes } = parseOfx(conteudo);
  if (transacoes.length === 0) {
    throw new Error("Não encontrei nenhum lançamento neste arquivo. Confira se é um OFX de extrato bancário.");
  }

  const fitIds = transacoes.map((t) => t.fitId);

  const [existentes, pendencias] = await Promise.all([
    db.movimentacao.findMany({
      where: { contaId, origemFitId: { in: fitIds } },
      select: { origemFitId: true },
    }),
    db.movimentacao.findMany({
      where: { empresaId, contaId, status: "PENDENTE", data: null },
      include: { categoria: true, conta: true, contato: true },
    }),
  ]);

  const fitIdsExistentes = new Set(existentes.map((e) => e.origemFitId));
  // Cada pendência só pode fechar uma linha do extrato — remove do conjunto
  // assim que casada, pra duas transações do mesmo valor não brigarem pela
  // mesma pendência.
  const pendenciasDisponiveis = new Map(pendencias.map((p) => [p.id, p]));

  const linhas: LinhaImportacao[] = transacoes.map((t) => {
    const duplicada = fitIdsExistentes.has(t.fitId);

    const pendenciaCasada = !duplicada
      ? [...pendenciasDisponiveis.values()].find(
          (p) => p.tipo === t.tipo && p.valorCentavos === t.valorCentavos,
        )
      : undefined;

    if (pendenciaCasada) pendenciasDisponiveis.delete(pendenciaCasada.id);

    const status: StatusLinhaImportacao = duplicada
      ? "DUPLICADA"
      : pendenciaCasada
        ? "CONCILIAVEL"
        : "NOVA";

    return {
      id: t.fitId,
      descricao: t.descricao,
      data: t.data,
      valorCentavos: t.valorCentavos,
      tipo: t.tipo,
      status,
      // Sugestão automática de categoria fica pra uma próxima etapa — por
      // enquanto a pessoa categoriza depois, em Movimentações.
      categoriaSugerida: null,
      conciliaCom: pendenciaCasada ? mapearMovimentacao(pendenciaCasada) : null,
      incluir: status !== "DUPLICADA",
    };
  });

  return {
    arquivoNome: nomeArquivo,
    conta: { id: conta.id, nome: conta.nome, cor: conta.cor, tipo: conta.tipo },
    linhas,
  };
}

/**
 * Grava de verdade: linha nova vira `Movimentacao` (status CONCILIADO, já
 * que veio direto do extrato do banco); linha conciliável fecha a pendência
 * existente em vez de duplicar. `origemFitId` é gravado nos dois casos —
 * reimportar o mesmo arquivo depois não recria nada.
 */
export async function confirmarImportacao(input: {
  nomeArquivo: string;
  contaId: string;
  linhas: LinhaImportacao[];
}): Promise<ResultadoConfirmacao> {
  const empresaId = await obterEmpresa();

  const importacao = await db.importacao.create({
    data: {
      empresaId,
      nomeArquivo: input.nomeArquivo,
      formato: "OFX",
      totalLinhas: input.linhas.length,
    },
  });

  let criadas = 0;
  let conciliadas = 0;

  for (const linha of input.linhas) {
    try {
      if (linha.status === "CONCILIAVEL" && linha.conciliaCom) {
        const mov = await db.movimentacao.update({
          where: { id: linha.conciliaCom.id },
          data: { status: "CONCILIADO", data: linha.data, origemFitId: linha.id },
        });
        await db.importacaoLinha.create({
          data: { importacaoId: importacao.id, movimentacaoId: mov.id },
        });
        conciliadas++;
      } else {
        const mov = await db.movimentacao.create({
          data: {
            empresaId,
            contaId: input.contaId,
            descricao: linha.descricao,
            tipo: linha.tipo,
            valorCentavos: linha.valorCentavos,
            status: "CONCILIADO",
            data: linha.data,
            dataCompetencia: linha.data,
            origemFitId: linha.id,
          },
        });
        await db.importacaoLinha.create({
          data: { importacaoId: importacao.id, movimentacaoId: mov.id },
        });
        criadas++;
      }
    } catch {
      // Chave de dedup (contaId + origemFitId) bateu com algo já importado
      // entre a revisão e a confirmação — pula em vez de derrubar o resto.
    }
  }

  revalidatePath("/movimentacoes");
  revalidatePath("/a-pagar-receber");
  revalidatePath("/");

  return { criadas, conciliadas };
}
