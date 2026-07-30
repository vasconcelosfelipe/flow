import type { ChaveIcone } from "@/lib/icones";
import type { TipoMovimentacao } from "@/types/dominio";

export type CategoriaCompleta = {
  id: string;
  nome: string;
  icone: ChaveIcone;
  cor: string;
  tipo: TipoMovimentacao;
  /** `null` até a pessoa escolher a linha — sem isso, a categoria some da DRE. */
  linhaDreId: string | null;
  /** Nome da linha da DRE para a qual esta categoria soma. */
  linhaDreNome: string;
  quantidadeMovimentacoes: number;
};

export type FormularioCategoria = {
  id?: string;
  nome: string;
  icone: ChaveIcone;
  cor: string;
  tipo: TipoMovimentacao;
  linhaDreId: string | null;
};
