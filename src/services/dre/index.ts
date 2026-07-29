import { isSameMonth } from "date-fns";

import { db } from "@/lib/db";
import { calcularMargem } from "@/lib/money";
import type { ChaveSecaoDre, DreResultado, LinhaDre, SecaoDre } from "@/services/dre/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type { TipoGrupoDre } from "@/types/dominio";

/**
 * Mapa de categoria → linha da DRE.
 *
 * Fase 1: fixo, escrito à mão sobre o catálogo de `lib/mock`. Fase 2: a mesma
 * relação passa a vir do cadastro de Categorias (cada categoria aponta para
 * uma conta de DRE) — a tela não muda, só de onde o agrupamento vem.
 *
 * `grupo` aqui é a granularidade fina usada pela tela de Categorias (para
 * filtrar quais contas fazem sentido por tipo); `secao` é a granularidade que
 * a DRE de fato exibe — categorias diferentes podem pertencer a grupos
 * distintos e ainda assim caírem todas dentro da mesma seção do relatório
 * (ex.: receitas e despesas não operacionais somam na mesma seção).
 */
export type DefinicaoLinhaDre = {
  id: string;
  nome: string;
  grupo: TipoGrupoDre;
  secao: ChaveSecaoDre;
  /** Sinal dentro da seção: uma receita soma, uma despesa da mesma seção subtrai. */
  sinal: 1 | -1;
  categorias: string[];
};

export const DEFINICAO_LINHAS: DefinicaoLinhaDre[] = [
  { id: "vendas", nome: "Vendas", grupo: "RECEITA", secao: "RECEITA_BRUTA", sinal: 1, categorias: ["cat_1", "cat_2"] },
  { id: "servicos", nome: "Prestação de serviços", grupo: "RECEITA", secao: "RECEITA_BRUTA", sinal: 1, categorias: ["cat_3"] },

  { id: "impostos-venda", nome: "Impostos sobre vendas", grupo: "DEDUCAO", secao: "DEDUCOES", sinal: 1, categorias: ["cat_10"] },

  { id: "cmv", nome: "Custo de mercadoria vendida", grupo: "CUSTO", secao: "CUSTOS", sinal: 1, categorias: ["cat_5"] },

  { id: "pessoal", nome: "Pessoal", grupo: "DESPESA", secao: "DESPESAS_OPERACIONAIS", sinal: 1, categorias: ["cat_7"] },
  { id: "ocupacao", nome: "Ocupação", grupo: "DESPESA", secao: "DESPESAS_OPERACIONAIS", sinal: 1, categorias: ["cat_6", "cat_8"] },
  { id: "marketing", nome: "Marketing e vendas", grupo: "DESPESA", secao: "DESPESAS_OPERACIONAIS", sinal: 1, categorias: ["cat_9"] },
  {
    id: "administrativas",
    nome: "Administrativas",
    grupo: "DESPESA",
    secao: "DESPESAS_OPERACIONAIS",
    sinal: 1,
    categorias: ["cat_11", "cat_12", "cat_13", "cat_14"],
  },

  {
    id: "receitas-nao-operacionais",
    nome: "Receitas não operacionais",
    grupo: "RECEITA_FINANCEIRA",
    secao: "RESULTADO_NAO_OPERACIONAL",
    sinal: 1,
    categorias: ["cat_4"],
  },
  {
    id: "despesas-nao-operacionais",
    nome: "Despesas não operacionais",
    grupo: "DESPESA_FINANCEIRA",
    secao: "RESULTADO_NAO_OPERACIONAL",
    sinal: -1,
    categorias: [],
  },

  {
    id: "tributos-lucro",
    nome: "IRPJ e CSLL",
    grupo: "TRIBUTOS_LUCRO",
    secao: "TRIBUTOS_LUCRO",
    sinal: 1,
    categorias: [],
  },
];

const ROTULO_SECAO: Record<ChaveSecaoDre, string> = {
  RECEITA_BRUTA: "Receita bruta",
  DEDUCOES: "Deduções",
  CUSTOS: "Custos",
  DESPESAS_OPERACIONAIS: "Despesas operacionais",
  RESULTADO_NAO_OPERACIONAL: "Resultado não operacional",
  TRIBUTOS_LUCRO: "Tributos sobre o lucro",
};

const ORDEM_SECOES: ChaveSecaoDre[] = [
  "RECEITA_BRUTA",
  "DEDUCOES",
  "CUSTOS",
  "DESPESAS_OPERACIONAIS",
  "RESULTADO_NAO_OPERACIONAL",
  "TRIBUTOS_LUCRO",
];

const CONCILIADO = ["CONCILIADO", "PAGO"] as const;

function realizadas(movs: MovimentacaoResumo[]) {
  return movs.filter(
    (m) => m.data !== null && CONCILIADO.includes(m.status as (typeof CONCILIADO)[number]),
  );
}

function somaZerada(quantidade: number): number[] {
  return Array.from({ length: quantidade }, () => 0);
}

function somarPorMes(movs: MovimentacaoResumo[], categorias: string[], meses: Date[]): number[] {
  if (categorias.length === 0) return somaZerada(meses.length);

  return meses.map((mes) =>
    movs
      .filter((m) => m.categoria !== null && categorias.includes(m.categoria.id) && m.data && isSameMonth(m.data, mes))
      .reduce((soma, m) => soma + m.valorCentavos, 0),
  );
}

export async function montarDre(empresaId: string, meses: Date[]): Promise<DreResultado> {
  const [rows, cats] = await Promise.all([
    db.movimentacao.findMany({
      where: { empresaId, status: { in: ["PAGO", "CONCILIADO"] }, data: { not: null } },
      include: { categoria: true, conta: true, contato: true },
    }),
    db.categoria.findMany({
      where: { empresaId, ativa: true, secaoDre: { not: null } },
    }),
  ]);

  const rawMovs: MovimentacaoResumo[] = rows.map((m) => ({
    id: m.id,
    descricao: m.descricao,
    valorCentavos: m.valorCentavos,
    tipo: m.tipo as "RECEITA" | "DESPESA",
    status: m.status as MovimentacaoResumo["status"],
    data: m.data,
    dataVencimento: m.dataVencimento,
    numeroParcela: m.numeroParcela,
    totalParcelas: m.totalParcelas,
    recorrente: m.recorrente,
    categoria: m.categoria
      ? { id: m.categoria.id, nome: m.categoria.nome, icone: m.categoria.icone, cor: m.categoria.cor }
      : null,
    conta: { id: m.conta.id, nome: m.conta.nome, cor: m.conta.cor, tipo: m.conta.tipo as MovimentacaoResumo["conta"]["tipo"] },
    contato: m.contato ? { id: m.contato.id, nome: m.contato.nome } : null,
  }));

  // Build dynamic lines from real categories grouped by secaoDre
  const catsPorSecao = new Map<ChaveSecaoDre, typeof cats>();
  for (const cat of cats) {
    if (!cat.secaoDre) continue;
    const secao = cat.secaoDre as ChaveSecaoDre;
    const grupo = catsPorSecao.get(secao) ?? [];
    grupo.push(cat);
    catsPorSecao.set(secao, grupo);
  }

  const dinamicas: DefinicaoLinhaDre[] = [];
  for (const [secao, grupo] of catsPorSecao.entries()) {
    for (const cat of grupo) {
      const grupo_tipo: TipoGrupoDre =
        cat.tipo === "RECEITA"
          ? secao === "RECEITA_BRUTA" ? "RECEITA" : "RECEITA_FINANCEIRA"
          : secao === "DEDUCOES" ? "DEDUCAO"
          : secao === "CUSTOS" ? "CUSTO"
          : secao === "TRIBUTOS_LUCRO" ? "TRIBUTOS_LUCRO"
          : secao === "RESULTADO_NAO_OPERACIONAL" ? "DESPESA_FINANCEIRA"
          : "DESPESA";

      const linhaExistente = dinamicas.find((d) => d.id === `secao-${secao}-${cat.tipo}`);
      if (linhaExistente) {
        linhaExistente.categorias.push(cat.id);
      } else {
        dinamicas.push({
          id: `secao-${secao}-${cat.tipo}`,
          nome: cat.tipo === "RECEITA" ? ROTULO_SECAO[secao] : ROTULO_SECAO[secao],
          grupo: grupo_tipo,
          secao,
          sinal: cat.tipo === "RECEITA" ? 1 : 1,
          categorias: [cat.id],
        });
      }
    }
  }

  // Merge dynamic lines with static structure for any secoes without categories
  const linhasFinais = dinamicas.length > 0 ? dinamicas : DEFINICAO_LINHAS;

  const movs = realizadas(rawMovs);
  const tamanho = meses.length;

  const secoes: SecaoDre[] = ORDEM_SECOES.map((chave) => {
    const linhas: LinhaDre[] = linhasFinais.filter((def) => def.secao === chave).map((def) => {
      const valores = somarPorMes(movs, def.categorias, meses);
      return {
        id: def.id,
        nome: def.nome,
        sinal: def.sinal,
        valores,
        totalCentavos: valores.reduce((a, b) => a + b, 0),
      };
    });

    // O sinal aplica-se aqui: uma despesa não operacional soma tamanho ao
    // total exibido, mas subtrai do valor da seção.
    const valores = linhas.reduce(
      (total, linha) => total.map((v, i) => v + linha.sinal * linha.valores[i]),
      somaZerada(tamanho),
    );

    return {
      chave,
      rotulo: ROTULO_SECAO[chave],
      linhas,
      valores,
      totalCentavos: valores.reduce((a, b) => a + b, 0),
    };
  }).filter((s) => s.linhas.length > 0);

  const porSecao = (chave: ChaveSecaoDre) => secoes.find((s) => s.chave === chave)?.valores ?? somaZerada(tamanho);

  const receitaBruta = porSecao("RECEITA_BRUTA");
  const deducoes = porSecao("DEDUCOES");
  const custos = porSecao("CUSTOS");
  const despesasOperacionais = porSecao("DESPESAS_OPERACIONAIS");
  const resultadoNaoOperacional = porSecao("RESULTADO_NAO_OPERACIONAL");
  const tributosSobreLucro = porSecao("TRIBUTOS_LUCRO");

  const receitaLiquida = receitaBruta.map((v, i) => v - deducoes[i]);
  const margemContribuicao = receitaLiquida.map((v, i) => calcularMargem(v, receitaBruta[i]));
  const lucroBruto = receitaLiquida.map((v, i) => v - custos[i] - despesasOperacionais[i]);
  const lucroAntesTributos = lucroBruto.map((v, i) => v + resultadoNaoOperacional[i]);
  const lucroLiquido = lucroAntesTributos.map((v, i) => v - tributosSobreLucro[i]);
  const margem = lucroLiquido.map((v, i) => calcularMargem(v, receitaLiquida[i]));

  return {
    meses,
    secoes,
    receitaBruta,
    deducoes,
    receitaLiquida,
    margemContribuicao,
    custos,
    despesasOperacionais,
    lucroBruto,
    resultadoNaoOperacional,
    lucroAntesTributos,
    tributosSobreLucro,
    lucroLiquido,
    margem,
  };
}

/** A conta de DRE para a qual uma categoria soma. `undefined` se nada a reivindica. */
export function linhaDreDaCategoria(categoriaId: string): DefinicaoLinhaDre | undefined {
  return DEFINICAO_LINHAS.find((def) => def.categorias.includes(categoriaId));
}
