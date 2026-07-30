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
