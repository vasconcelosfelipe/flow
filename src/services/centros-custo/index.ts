import { CENTROS_CUSTO_MOCK } from "@/lib/mock/dados";
import type { CentroCustoCompleto } from "@/services/centros-custo/dto";

/**
 * Fase 1: `MovimentacaoResumo` ainda não carrega centro de custo (só o
 * detalhe, e nenhum lançamento do mock usa isso ainda), então a contagem de
 * uso nasce em zero. Fase 2 conta de verdade contra `movimentacao.centroCustoId`.
 */
export function listarCentrosCusto(): CentroCustoCompleto[] {
  return CENTROS_CUSTO_MOCK.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: c.cor,
    quantidadeMovimentacoes: 0,
  }));
}
