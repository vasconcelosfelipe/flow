import type { ChaveSecaoDre } from "@/services/dre/dto";
import type { TipoGrupoDre } from "@/types/dominio";

export type DefinicaoLinhaDre = {
  id: string;
  nome: string;
  grupo: TipoGrupoDre;
  secao: ChaveSecaoDre;
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
  { id: "administrativas", nome: "Administrativas", grupo: "DESPESA", secao: "DESPESAS_OPERACIONAIS", sinal: 1, categorias: ["cat_11", "cat_12", "cat_13", "cat_14"] },
  { id: "receitas-nao-operacionais", nome: "Receitas não operacionais", grupo: "RECEITA_FINANCEIRA", secao: "RESULTADO_NAO_OPERACIONAL", sinal: 1, categorias: ["cat_4"] },
  { id: "despesas-nao-operacionais", nome: "Despesas não operacionais", grupo: "DESPESA_FINANCEIRA", secao: "RESULTADO_NAO_OPERACIONAL", sinal: -1, categorias: [] },
  { id: "tributos-lucro", nome: "IRPJ e CSLL", grupo: "TRIBUTOS_LUCRO", secao: "TRIBUTOS_LUCRO", sinal: 1, categorias: [] },
];

export const ROTULO_SECAO: Record<ChaveSecaoDre, string> = {
  RECEITA_BRUTA: "Receita bruta",
  DEDUCOES: "Deduções",
  CUSTOS: "Custos",
  DESPESAS_OPERACIONAIS: "Despesas operacionais",
  RESULTADO_NAO_OPERACIONAL: "Resultado não operacional",
  TRIBUTOS_LUCRO: "Tributos sobre o lucro",
};

export const ORDEM_SECOES: ChaveSecaoDre[] = [
  "RECEITA_BRUTA",
  "DEDUCOES",
  "CUSTOS",
  "DESPESAS_OPERACIONAIS",
  "RESULTADO_NAO_OPERACIONAL",
  "TRIBUTOS_LUCRO",
];

export function linhaDreDaCategoria(categoriaId: string): DefinicaoLinhaDre | undefined {
  return DEFINICAO_LINHAS.find((def) => def.categorias.includes(categoriaId));
}
