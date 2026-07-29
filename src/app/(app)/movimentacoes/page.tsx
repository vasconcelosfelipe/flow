import { Container } from "@/components/layout/container";
import { PeriodPicker } from "@/components/shared/period-picker";
import { FiltrosMovimentacoes } from "@/features/movimentacoes/filtros";
import { ListaMovimentacoes } from "@/features/movimentacoes/lista-movimentacoes";
import { resolverPeriodoDeParams } from "@/lib/dates";
import { listarMovimentacoes } from "@/services/movimentacoes";
import type { TipoMovimentacao } from "@/types/dominio";

type Props = {
  searchParams: Promise<{
    periodo?: string;
    de?: string;
    ate?: string;
    conta?: string;
    categoria?: string;
    tipo?: string;
    busca?: string;
    semCategoria?: string;
  }>;
};

/**
 * O coração do fluxo: OFX → Movimentações → Categorizar → DRE. Esta tela é
 * onde a maior parte do tempo de uso do produto realmente acontece, então
 * filtro e busca ficam sempre visíveis, sem esconder atrás de um toque extra.
 */
export default async function MovimentacoesPage({ searchParams }: Props) {
  const params = await searchParams;
  const periodo = resolverPeriodoDeParams(params);

  const pagina = listarMovimentacoes({
    de: periodo.de,
    ate: periodo.ate,
    contaId: params.conta,
    categoriaId: params.categoria,
    tipo: params.tipo as TipoMovimentacao | undefined,
    busca: params.busca,
    semCategoria: params.semCategoria === "1",
  });

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Movimentações</h1>

      <PeriodPicker />
      <FiltrosMovimentacoes />

      <p className="text-micro text-ink-muted">
        {pagina.total} {pagina.total === 1 ? "movimentação" : "movimentações"}
      </p>

      <ListaMovimentacoes grupos={pagina.grupos} />
    </Container>
  );
}
