import { AlertTriangle, Receipt } from "lucide-react";

import { Container } from "@/components/layout/container";
import { StatCard } from "@/components/shared/stat-card";
import { FiltrosPendencias } from "@/features/pendencias/filtros";
import { ListaPendencias } from "@/features/pendencias/lista-pendencias";
import { listarPendencias } from "@/services/pendencias";
import type { TipoMovimentacao } from "@/types/dominio";

type Props = {
  searchParams: Promise<{ tipo?: string; situacao?: string }>;
};

/**
 * O que falta pagar e o que falta receber, num só lugar. Reaproveita a mesma
 * linha de detalhe das Movimentações — a pessoa não precisa aprender uma
 * segunda gaveta de detalhe para um título que ainda não virou extrato.
 */
export default async function APagarReceberPage({ searchParams }: Props) {
  const params = await searchParams;
  const tipo = params.tipo === "DESPESA" || params.tipo === "RECEITA" ? params.tipo : undefined;

  const pagina = listarPendencias({
    tipo: tipo as TipoMovimentacao | undefined,
    situacao: params.situacao === "vencidas" ? "vencidas" : undefined,
  });

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">A pagar e a receber</h1>

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
