import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Container } from "@/components/layout/container";
import { PeriodPicker } from "@/components/shared/period-picker";
import { StatCard } from "@/components/shared/stat-card";
import { FiltrosPendencias } from "@/features/pendencias/filtros";
import { ListaPendencias } from "@/features/pendencias/lista-pendencias";
import { BotaoNovaPendencia } from "@/features/pendencias/nova-pendencia";
import { resolverPeriodoDeParams } from "@/lib/dates";
import { requireSessao } from "@/lib/sessao";
import { listarCategorias } from "@/services/categorias";
import { listarContas } from "@/services/contas";
import { listarContatos } from "@/services/contatos";
import { listarLinhasDre } from "@/services/linhas-dre";
import { listarPendencias, obterTotaisPendencias } from "@/services/pendencias";
import type { TipoMovimentacao } from "@/types/dominio";

type Props = {
  searchParams: Promise<{
    tipo?: string;
    situacao?: string;
    periodo?: string;
    de?: string;
    ate?: string;
  }>;
};

export default async function APagarReceberPage({ searchParams }: Props) {
  const [params, { empresaAtiva }] = await Promise.all([searchParams, requireSessao()]);
  const tipo = params.tipo === "DESPESA" || params.tipo === "RECEITA" ? params.tipo : undefined;
  const vencidas = params.situacao === "vencidas";
  const periodo = resolverPeriodoDeParams(params);
  const somenteLeitura = empresaAtiva.papel === "LEITOR";

  const [pagina, totais, contas, categorias, contatos, linhas] = await Promise.all([
    listarPendencias(empresaAtiva.id, {
      tipo: tipo as TipoMovimentacao | undefined,
      situacao: vencidas ? "vencidas" : undefined,
      ...(vencidas ? {} : { de: periodo.de, ate: periodo.ate }),
    }),
    obterTotaisPendencias(empresaAtiva.id, vencidas ? null : periodo),
    listarContas(empresaAtiva.id),
    listarCategorias(empresaAtiva.id),
    listarContatos(empresaAtiva.id),
    listarLinhasDre(),
  ]);

  return (
    <Container className="space-y-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-titulo font-semibold text-ink">A pagar e a receber</h1>
        <BotaoNovaPendencia
          contas={contas.map((c) => ({ id: c.id, nome: c.nome }))}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
          somenteLeitura={somenteLeitura}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          rotulo="A pagar"
          centavos={totais.aPagar.totalCentavos}
          icone={ArrowUpRight}
          tom="negativo"
          detalhe={`${totais.aPagar.quantidade} ${totais.aPagar.quantidade === 1 ? "título" : "títulos"}${
            totais.aPagar.vencidoCentavos > 0 ? " · vencidos" : ""
          }`}
        />
        <StatCard
          rotulo="A receber"
          centavos={totais.aReceber.totalCentavos}
          icone={ArrowDownLeft}
          tom="positivo"
          detalhe={`${totais.aReceber.quantidade} ${totais.aReceber.quantidade === 1 ? "título" : "títulos"}${
            totais.aReceber.vencidoCentavos > 0 ? " · vencidos" : ""
          }`}
        />
      </div>

      <PeriodPicker />
      <FiltrosPendencias />

      <ListaPendencias
        itens={pagina.itens}
        contas={contas.map((c) => ({ id: c.id, nome: c.nome }))}
        categorias={categorias}
        contatos={contatos}
        linhas={linhas}
        somenteLeitura={somenteLeitura}
      />
    </Container>
  );
}
