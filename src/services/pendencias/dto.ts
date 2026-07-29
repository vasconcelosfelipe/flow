import type { Centavos } from "@/lib/money";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type { TipoMovimentacao } from "@/types/dominio";

/**
 * Contrato da tela de A pagar/receber. Mesma regra das Movimentações: Fase 1
 * preenche com mock, Fase 2 com Prisma, nenhum componente muda no meio.
 */

export type FiltroPendencias = {
  tipo?: TipoMovimentacao;
  /** Atalho vindo dos alertas do dashboard: só o que já venceu. */
  situacao?: "vencidas";
};

/** Pendências de um contato, já somadas — a lista agrupa por quem cobra ou é cobrado. */
export type GrupoContato = {
  chave: string;
  rotulo: string;
  totalCentavos: Centavos;
  itens: MovimentacaoResumo[];
};

export type PaginaPendencias = {
  grupos: GrupoContato[];
  quantidade: number;
  totalCentavos: Centavos;
  vencidoCentavos: Centavos;
};
