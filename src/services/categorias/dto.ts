import type { ChaveIcone } from "@/lib/icones";
import type { TipoGrupoDre, TipoMovimentacao } from "@/types/dominio";

/**
 * Contrato da tela de Categorias. Fase 1 guarda em memória; Fase 2 é a
 * própria tabela `Categoria` do Prisma, com `linhaDreId` como chave
 * estrangeira em vez do nome livre usado aqui.
 */

export type CategoriaCompleta = {
  id: string;
  nome: string;
  icone: ChaveIcone;
  cor: string;
  tipo: TipoMovimentacao;
  grupoDre: TipoGrupoDre;
  /** `null` até a pessoa escolher a conta — sem isso, a linha some da DRE. */
  linhaDreId: string | null;
  /** Nome da conta de DRE para a qual esta categoria soma. */
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
