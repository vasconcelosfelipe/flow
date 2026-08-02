import type { Centavos } from "@/lib/money";
import type { TipoMovimentacao } from "@/types/dominio";

/**
 * Contrato da DRE, seguindo o modelo gerencial:
 *
 * Receita Bruta → (-) Deduções → (=) Receita Líquida → (-) Custos dos
 * Produtos → (=) Margem de Contribuição → (-) Despesas Operacionais →
 * (=) Resultado Operacional → (+/-) Outras Receitas/Despesas →
 * (-) Tributos sobre o Lucro → (=) Resultado Líquido.
 *
 * A cascata em si é fixa — sempre estas linhas, nesta ordem. O que NÃO é
 * fixo é quais categorias compõem cada linha: isso vem inteiramente de
 * `Categoria.linhaDreId`, configurado na tela de Categorias. A DRE nunca
 * decide sozinha "categoria X pertence à linha Y" — ela só pergunta ao
 * banco. Cada linha mostra suas categorias reais quando expandida; nunca
 * uma linha fictícia repetindo o nome da própria seção.
 *
 * Cada linha/total carrega um valor por mês do recorte pedido: um só mês na
 * visão mensal, doze na anual.
 */

/** Uma categoria real, com o total que ela soma dentro de uma linha da DRE. */
export type ItemLinhaDre = {
  categoriaId: string;
  nome: string;
  tipo: TipoMovimentacao;
  valores: Centavos[];
  totalCentavos: Centavos;
  /** Subcategorias — sempre herdam a mesma linha da DRE da categoria mãe,
   * então aparecem aninhadas aqui em vez de como item irmão solto. Só um
   * nível: nunca tem subitens dentro de um subitem. */
  subitens: ItemLinhaDre[];
};

/** Uma das seis linhas fixas — a unidade que expande/colapsa na tela. */
export type LinhaDreResultado = {
  id: string;
  nome: string;
  ordem: number;
  itens: ItemLinhaDre[];
  /** Soma dos itens; na linha mista (Outras Receitas/Despesas) já é líquida. */
  valores: Centavos[];
  totalCentavos: Centavos;
};

export type DreResultado = {
  meses: Date[];
  /** Só as linhas com ao menos uma categoria com movimentação no período. */
  linhas: LinhaDreResultado[];

  receitaBruta: Centavos[];
  deducoes: Centavos[];
  receitaLiquida: Centavos[];
  custos: Centavos[];
  margemContribuicao: Centavos[];
  /** Margem de contribuição sobre receita líquida, em basis points. */
  margemContribuicaoPercentual: (number | null)[];
  despesasOperacionais: Centavos[];
  resultadoOperacional: Centavos[];
  /** Já líquido — receitas somam, despesas subtraem dentro da própria linha. */
  outrasReceitasDespesas: Centavos[];
  tributosSobreLucro: Centavos[];
  resultadoLiquido: Centavos[];

  /** Resultado líquido sobre receita líquida, em basis points. */
  margem: (number | null)[];
};
