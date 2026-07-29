import type { Centavos } from "@/lib/money";

/**
 * Contrato da DRE, seguindo o modelo:
 *
 * Receita Bruta → Deduções → Receita Líquida → Custos e Despesas
 * Operacionais → Lucro Bruto → Receitas/Despesas Não Operacionais →
 * Resultado Não Operacional → Lucro Antes dos Tributos → Tributos sobre o
 * Lucro → Lucro Líquido.
 *
 * A DRE mostra só estas linhas — nunca uma por categoria financeira. Uma
 * categoria como "Juros de empréstimo" ou "IRPJ" vive vinculada a uma destas
 * seções (`SecaoDre`) e some dentro dela quando a pessoa expande; ela nunca
 * ganha uma linha própria no relatório.
 *
 * Fase 1 soma sobre `lib/mock`; Fase 2 substitui por uma consulta agregada
 * no Prisma — a sequência de totalizadores e as seções não mudam, só de
 * onde vem a soma.
 *
 * Cada linha/total carrega um valor por mês do recorte pedido: um só mês na
 * visão mensal, doze na anual.
 */

export type LinhaDre = {
  id: string;
  nome: string;
  /** Como esta categoria entra na soma da seção — uma despesa aparece ao
   * lado da receita da mesma seção, mas subtrai. */
  sinal: 1 | -1;
  valores: Centavos[];
  totalCentavos: Centavos;
};

export type ChaveSecaoDre =
  | "RECEITA_BRUTA"
  | "DEDUCOES"
  | "CUSTOS"
  | "DESPESAS_OPERACIONAIS"
  | "RESULTADO_NAO_OPERACIONAL"
  | "TRIBUTOS_LUCRO";

/** Uma das seções que agregam categorias — a unidade que expande/colapsa na tela. */
export type SecaoDre = {
  chave: ChaveSecaoDre;
  rotulo: string;
  linhas: LinhaDre[];
  valores: Centavos[];
  totalCentavos: Centavos;
};

export type DreResultado = {
  meses: Date[];
  secoes: SecaoDre[];

  receitaBruta: Centavos[];
  deducoes: Centavos[];
  receitaLiquida: Centavos[];
  /** Receita líquida sobre receita bruta, em basis points. `null` sem base. */
  margemContribuicao: (number | null)[];
  custos: Centavos[];
  despesasOperacionais: Centavos[];
  lucroBruto: Centavos[];
  resultadoNaoOperacional: Centavos[];
  lucroAntesTributos: Centavos[];
  tributosSobreLucro: Centavos[];
  lucroLiquido: Centavos[];

  /** Margem do lucro líquido sobre a receita líquida, em basis points. `null` sem base. */
  margem: (number | null)[];
};
