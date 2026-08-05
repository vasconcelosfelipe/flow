"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { parseOfx } from "@/lib/ofx";
import { requireEscrita } from "@/lib/permissoes";
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
  requireEscrita(sessao);
  return sessao.empresaAtiva.id;
}

/**
 * Reduz a descrição ao "núcleo" que se repete entre ocorrências do mesmo
 * lançamento — extratos bancários variam a descrição de uma recorrência pra
 * outra só por causa de números (data, ID da transação, parcela). Maiúsculas
 * + sem dígitos + espaços colapsados já é o bastante pra casar "PIX RECEBIDO
 * — JOAO 04/03" com "PIX RECEBIDO — JOAO 11/04".
 */
function normalizarDescricao(descricao: string): string {
  return descricao
    .toUpperCase()
    .replace(/\d+/g, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Aprendizado da conciliação: uma linha nova sem categoria/fornecedor ainda
 * herda o que a pessoa escolheu da última vez que uma descrição parecida
 * apareceu (mesma descrição normalizada + mesmo tipo). Só olha pro histórico
 * já conciliado — é a única fonte que representa uma decisão confirmada de
 * verdade, não um rascunho de importação anterior.
 */
async function aprenderComHistorico(
  empresaId: string,
): Promise<Map<string, { categoriaId: string | null; contatoId: string | null }>> {
  const historico = await db.movimentacao.findMany({
    where: { empresaId, status: "CONCILIADO", data: { not: null } },
    select: { descricao: true, tipo: true, categoriaId: true, contatoId: true },
    orderBy: { data: "desc" },
    take: 3000,
  });

  const mapa = new Map<string, { categoriaId: string | null; contatoId: string | null }>();
  for (const mov of historico) {
    if (mov.categoriaId === null && mov.contatoId === null) continue;
    const nucleo = normalizarDescricao(mov.descricao);
    if (!nucleo) continue;
    const chave = `${mov.tipo}::${nucleo}`;
    // Primeira ocorrência de cada chave vence — a lista já vem da mais
    // recente pra mais antiga, então isso é sempre a categorização mais
    // recente pra aquele "tipo" de lançamento.
    if (!mapa.has(chave)) mapa.set(chave, { categoriaId: mov.categoriaId, contatoId: mov.contatoId });
  }
  return mapa;
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

  const [existentes, ignoradas, pendencias, historico] = await Promise.all([
    // Só CONCILIADO conta como "já importada" — é o único status que deveria
    // ter origemFitId de verdade. Uma movimentação que saiu de CONCILIADO (por
    // desfazer, por exclusão, ou por edição direta do status) não deve travar
    // a linha do extrato pra sempre, mesmo que o origemFitId antigo não tenha
    // sido limpo em algum caminho de código passado.
    db.movimentacao.findMany({
      where: { contaId, origemFitId: { in: fitIds }, status: "CONCILIADO" },
      select: { origemFitId: true },
    }),
    // Linhas marcadas "ignorar permanentemente" numa importação anterior —
    // não viraram lançamento, só a chave de dedup.
    db.importacaoLinha.findMany({
      where: { contaId, fitId: { in: fitIds } },
      select: { fitId: true },
    }),
    db.movimentacao.findMany({
      where: { empresaId, contaId, status: "PENDENTE", data: null },
      include: { categoria: true, conta: true, contato: true },
    }),
    aprenderComHistorico(empresaId),
  ]);

  const fitIdsExistentes = new Set(existentes.map((e) => e.origemFitId));
  const fitIdsIgnorados = new Set(ignoradas.map((i) => i.fitId));
  // Cada pendência só pode fechar uma linha do extrato — remove do conjunto
  // assim que casada, pra duas transações do mesmo valor não brigarem pela
  // mesma pendência.
  const pendenciasDisponiveis = new Map(pendencias.map((p) => [p.id, p]));

  const linhas: LinhaImportacao[] = transacoes.map((t) => {
    const duplicada = fitIdsExistentes.has(t.fitId);
    const ignoradaAntes = !duplicada && fitIdsIgnorados.has(t.fitId);

    const pendenciaCasada = !duplicada && !ignoradaAntes
      ? [...pendenciasDisponiveis.values()].find(
          (p) => p.tipo === t.tipo && p.valorCentavos === t.valorCentavos,
        )
      : undefined;

    if (pendenciaCasada) pendenciasDisponiveis.delete(pendenciaCasada.id);

    const status: StatusLinhaImportacao = duplicada
      ? "DUPLICADA"
      : ignoradaAntes
        ? "IGNORADA"
        : pendenciaCasada
          ? "CONCILIAVEL"
          : "NOVA";

    // Linha conciliável já herda categoria/fornecedor da pendência que está
    // fechando — só linha nova de fato precisa do aprendizado do histórico.
    const aprendido = status === "NOVA"
      ? historico.get(`${t.tipo}::${normalizarDescricao(t.descricao)}`)
      : undefined;

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
      incluir: status !== "DUPLICADA" && status !== "IGNORADA",
      ignorarPermanentemente: false,
      categoriaId: pendenciaCasada?.categoriaId ?? aprendido?.categoriaId ?? null,
      contatoId: pendenciaCasada?.contatoId ?? aprendido?.contatoId ?? null,
      ehTransferencia: false,
      contaTransferenciaId: null,
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
  let ignoradas = 0;

  for (const linha of input.linhas) {
    try {
      if (linha.ignorarPermanentemente) {
        // Não vira lançamento nenhum — só grava a chave de dedup, pra esta
        // linha nunca mais aparecer como candidata numa reimportação futura.
        await db.importacaoLinha.create({
          data: { importacaoId: importacao.id, contaId: input.contaId, fitId: linha.id },
        });
        ignoradas++;
      } else if (linha.ehTransferencia && linha.contaTransferenciaId) {
        // Um crédito/débito do extrato que na verdade é dinheiro migrando
        // entre contas da própria empresa — vira as duas pernas de uma
        // transferência em vez de um lançamento comum. DESPESA = saiu desta
        // conta rumo à outra; RECEITA = entrou nesta vinda da outra.
        const outraContaId = linha.contaTransferenciaId;
        const contaOrigemId = linha.tipo === "DESPESA" ? input.contaId : outraContaId;
        const contaDestinoId = linha.tipo === "DESPESA" ? outraContaId : input.contaId;

        const [contaOrigem, contaDestino] = await Promise.all([
          db.conta.findUniqueOrThrow({ where: { id: contaOrigemId } }),
          db.conta.findUniqueOrThrow({ where: { id: contaDestinoId } }),
        ]);

        const transferenciaId = crypto.randomUUID();
        const [movOrigem, movDestino] = await db.$transaction([
          db.movimentacao.create({
            data: {
              empresaId,
              contaId: contaOrigemId,
              descricao: linha.descricao || `Transferência para ${contaDestino.nome}`,
              tipo: "DESPESA",
              valorCentavos: linha.valorCentavos,
              status: "CONCILIADO",
              data: linha.data,
              dataCompetencia: linha.data,
              transferenciaId,
              // origemFitId só na perna da conta que está sendo importada —
              // é a chave de dedup, a outra perna é sintética.
              origemFitId: contaOrigemId === input.contaId ? linha.id : null,
            },
          }),
          db.movimentacao.create({
            data: {
              empresaId,
              contaId: contaDestinoId,
              descricao: linha.descricao || `Transferência de ${contaOrigem.nome}`,
              tipo: "RECEITA",
              valorCentavos: linha.valorCentavos,
              status: "CONCILIADO",
              data: linha.data,
              dataCompetencia: linha.data,
              transferenciaId,
              origemFitId: contaDestinoId === input.contaId ? linha.id : null,
            },
          }),
        ]);

        const movImportada = contaOrigemId === input.contaId ? movOrigem : movDestino;
        await db.importacaoLinha.create({
          data: { importacaoId: importacao.id, movimentacaoId: movImportada.id },
        });
        criadas++;
      } else if (linha.status === "CONCILIAVEL" && linha.conciliaCom) {
        const mov = await db.movimentacao.update({
          where: { id: linha.conciliaCom.id },
          data: {
            status: "CONCILIADO",
            data: linha.data,
            origemFitId: linha.id,
            categoriaId: linha.categoriaId,
            contatoId: linha.contatoId,
            descricao: linha.descricao,
          },
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
            categoriaId: linha.categoriaId,
            contatoId: linha.contatoId,
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

  return { criadas, conciliadas, ignoradas };
}
