import { AlertTriangle, Receipt } from "lucide-react";

import { Container } from "@/components/layout/container";
import { StatCard } from "@/components/shared/stat-card";
import { FiltrosPendencias } from "@/features/pendencias/filtros";
import { ListaPendencias } from "@/features/pendencias/lista-pendencias";
import { BotaoNovaPendencia } from "@/features/pendencias/nova-pendencia";
import { requireSessao } from "@/lib/sessao";
import { listarContas } from "@/services/contas";
import { listarPendencias } from "@/services/pendencias";
import type { TipoMovimentacao } from "@/types/dominio";

type Props = {
  searchParams: Promise<{ tipo?: string; situacao?: string }>;
};

export default async function APagarReceberPage({ searchParams }: Props) {
  const [params, { empresaAtiva }] = await Promise.all([searchParams, requireSessao()]);
  const tipo = params.tipo === "DESPESA" || params.tipo === "RECEITA" ? params.tipo : undefined;

  const [pagina, contas] = await Promise.all([
    listarPendencias(empresaAtiva.id, {
      tipo: tipo as TipoMovimentacao | undefined,
      situacao: params.situacao === "vencidas" ? "vencidas" : undefined,
    }),
    listarContas(empresaAtiva.id),
  ]);

  return (
    <Container className="space-y-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-titulo font-semibold text-ink">A pagar e a receber</h1>
        <BotaoNovaPendencia contas={contas.map((c) => ({ id: c.id, nome: c.nome }))} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          rotulo="Em aberto"
          centavos={pagina.totalCentavos}
          icone={Receipt}
          detalhe={`${pagina.quantidade} ${pagina.quantidade === 1 ? "título" : "títulos"}`}
        />
        <StatCard
          rotulo="Vencido"
          centavos={pagina.vencidoCentavos}
          icone={AlertTriangle}
          tom={pagina.vencidoCentavos > 0 ? "negativo" : "neutro"}
        />
      </div>

      <FiltrosPendencias />

      <ListaPendencias grupos={pagina.grupos} />
    </Container>
  );
}
