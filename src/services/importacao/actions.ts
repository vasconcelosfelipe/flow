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

/** Conjunto de trigramas (janelas de 3 caracteres) de uma string já
 * normalizada — a mesma técnica por trás do `pg_trgm` do Postgres, só que
 * calculada em memória: não precisa de extensão nenhuma no banco. Descrição
 * curta demais pra ter trigrama (ex.: "PIX") vira ela mesma um único item,
 * senão nunca teria como comparar. */
function trigramas(s: string): Set<string> {
  if (s.length < 3) return new Set(s ? [s] : []);
  const conjunto = new Set<string>();
  for (let i = 0; i <= s.length - 3; i++) conjunto.add(s.slice(i, i + 3));
  return conjunto;
}

/** Coeficiente de Dice: 2×interseção / soma dos tamanhos — 1 quando os dois
 * conjuntos são idênticos, 0 quando não compartilham nenhum trigrama.
 * Devolve a contagem bruta junto porque o score sozinho engana em conjuntos
 * pequenos (2 de 3 trigramas em comum já é 0,8). */
function similaridade(a: Set<string>, b: Set<string>): { score: number; comuns: number } {
  if (a.size === 0 || b.size === 0) return { score: 0, comuns: 0 };
  let comuns = 0;
  for (const t of a) if (b.has(t)) comuns++;
  return { score: (2 * comuns) / (a.size + b.size), comuns };
}

/** Abaixo disso, duas descrições são consideradas coincidência, não a mesma
 * origem — calibrado pra pegar abreviação/variação de grafia sem misturar
 * fornecedores diferentes que só por acaso compartilham uma palavra. Ficou
 * mais alto do que o normal pra esse tipo de comparação (0,45 já causou
 * PIX virando "Cartão de crédito" na prática) — prefere não sugerir nada a
 * sugerir errado. */
const LIMIAR_SIMILARIDADE = 0.72;

/** Descrição curta (ex.: "PIX", "TED") não tem trigramas suficientes pra um
 * score de similaridade significar algo — só entra no match por igualdade
 * exata, nunca por parecença. */
const NUCLEO_MINIMO_PARA_SIMILARIDADE = 10;

/** Mesmo passando no limiar percentual, dois conjuntos pequenos podem bater
 * essa fração só com 1-2 trigramas em comum — exige um mínimo absoluto pra
 * o score não ser inflado por coincidência. */
const TRIGRAMAS_COMUNS_MINIMOS = 4;

type HistoricoEntrada = {
  nucleo: string;
  trigramas: Set<string>;
  tipo: string;
  categoriaId: string | null;
  contatoId: string | null;
};

/**
 * Aprendizado da conciliação: uma linha nova sem categoria/fornecedor ainda
 * herda o que a pessoa escolheu da última vez que uma descrição parecida
 * apareceu — igual (mesmo núcleo) ou só parecida (trigramas em comum acima
 * do limiar), sempre restrito ao mesmo tipo (RECEITA/DESPESA). Só olha pro
 * histórico já conciliado — é a única fonte que representa uma decisão
 * confirmada de verdade, não um rascunho de importação anterior.
 */
async function aprenderComHistorico(empresaId: string): Promise<HistoricoEntrada[]> {
  const historico = await db.movimentacao.findMany({
    where: { empresaId, status: "CONCILIADO", data: { not: null } },
    select: { descricao: true, tipo: true, categoriaId: true, contatoId: true },
    orderBy: { data: "desc" },
    take: 3000,
  });

  const vistos = new Set<string>();
  const entradas: HistoricoEntrada[] = [];
  for (const mov of historico) {
    if (mov.categoriaId === null && mov.contatoId === null) continue;
    const nucleo = normalizarDescricao(mov.descricao);
    if (!nucleo) continue;
    const chave = `${mov.tipo}::${nucleo}`;
    // Descrição repetida (mesmo núcleo) só entra uma vez — a lista já vem da
    // mais recente pra mais antiga, então a primeira é sempre a
    // categorização mais recente pra aquele "tipo" de lançamento.
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    entradas.push({
      nucleo,
      trigramas: trigramas(nucleo),
      tipo: mov.tipo,
      categoriaId: mov.categoriaId,
      contatoId: mov.contatoId,
    });
  }
  return entradas;
}

/** Acha a melhor pista pro histórico pra uma descrição nova: primeiro tenta
 * bater exato (núcleo idêntico), senão pega a entrada mais parecida acima do
 * limiar. Restrito ao mesmo tipo — RECEITA nunca sugere categoria/fornecedor
 * de uma DESPESA parecida por coincidência de texto. */
function encontrarAprendizado(
  descricao: string,
  tipo: string,
  historico: HistoricoEntrada[],
): { categoriaId: string | null; contatoId: string | null } | null {
  const nucleo = normalizarDescricao(descricao);
  if (!nucleo) return null;

  const doTipo = historico.filter((h) => h.tipo === tipo);

  const exato = doTipo.find((h) => h.nucleo === nucleo);
  if (exato) return { categoriaId: exato.categoriaId, contatoId: exato.contatoId };

  // Descrição curta demais — só o match exato acima vale, comparar por
  // trigrama aqui é ruído (foi assim que um PIX virou "Cartão de crédito").
  if (nucleo.length < NUCLEO_MINIMO_PARA_SIMILARIDADE) return null;

  const trigramasDaLinha = trigramas(nucleo);
  let melhor: HistoricoEntrada | null = null;
  let melhorScore = LIMIAR_SIMILARIDADE;
  for (const h of doTipo) {
    if (h.nucleo.length < NUCLEO_MINIMO_PARA_SIMILARIDADE) continue;
    const { score, comuns } = similaridade(trigramasDaLinha, h.trigramas);
    if (comuns >= TRIGRAMAS_COMUNS_MINIMOS && score > melhorScore) {
      melhorScore = score;
      melhor = h;
    }
  }
  return melhor ? { categoriaId: melhor.categoriaId, contatoId: melhor.contatoId } : null;
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
      ? encontrarAprendizado(t.descricao, t.tipo, historico)
      : null;

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
