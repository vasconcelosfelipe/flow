import { Container } from "@/components/layout/container";
import { PeriodPicker } from "@/components/shared/period-picker";
import { FiltrosMovimentacoes } from "@/features/movimentacoes/filtros";
import { ListaMovimentacoes } from "@/features/movimentacoes/lista-movimentacoes";
import { BotoesMovimentacoes } from "@/features/movimentacoes/nova-movimentacao";
import { resolverPeriodoDeParams } from "@/lib/dates";
import { requireSessao } from "@/lib/sessao";
import { listarContas } from "@/services/contas";
import { listarCategorias } from "@/services/categorias";
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

export default async function MovimentacoesPage({ searchParams }: Props) {
  const [params, { empresaAtiva }] = await Promise.all([searchParams, requireSessao()]);
  const periodo = resolverPeriodoDeParams(params);

  const [pagina, contas, categorias] = await Promise.all([
    listarMovimentacoes(empresaAtiva.id, {
      de: periodo.de,
      ate: periodo.ate,
      contaId: params.conta,
      categoriaId: params.categoria,
      tipo: params.tipo as TipoMovimentacao | undefined,
      busca: params.busca,
      semCategoria: params.semCategoria === "1",
    }),
    listarContas(empresaAtiva.id),
    listarCategorias(empresaAtiva.id),
  ]);

  return (
    <Container className="space-y-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-titulo font-semibold text-ink">Movimentações</h1>
        <BotoesMovimentacoes />
      </div>

      <PeriodPicker />
      <FiltrosMovimentacoes
        contas={contas.map((c) => ({ id: c.id, nome: c.nome }))}
        categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
      />

      <p className="text-micro text-ink-muted">
        {pagina.total} {pagina.total === 1 ? "movimentação" : "movimentações"}
      </p>

      <ListaMovimentacoes grupos={pagina.grupos} />
    </Container>
  );
}
