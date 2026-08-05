import type { Centavos } from "@/lib/money";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type { TipoMovimentacao } from "@/types/dominio";

/**
 * Contrato da tela de A pagar/receber. Mesma regra das Movimentações: Fase 1
 * preenche com mock, Fase 2 com Prisma, nenhum componente muda no meio.
 */

export type FiltroPendencias = {
  tipo?: TipoMovimentacao;
  de?: Date;
  ate?: Date;
};

export type PaginaPendencias = {
  itens: MovimentacaoResumo[];
  quantidade: number;
  totalCentavos: Centavos;
  vencidoCentavos: Centavos;
};

export type TotalPendencia = {
  totalCentavos: Centavos;
  quantidade: number;
  vencidoCentavos: Centavos;
};

export type TotaisPendencias = {
  aPagar: TotalPendencia;
  aReceber: TotalPendencia;
};
