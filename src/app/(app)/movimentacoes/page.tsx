import { Container } from "@/components/layout/container";
import { PeriodPicker } from "@/components/shared/period-picker";
import { FiltrosMovimentacoes } from "@/features/movimentacoes/filtros";
import { ListaMovimentacoes } from "@/features/movimentacoes/lista-movimentacoes";
import { BotaoNovaMovimentacao } from "@/features/movimentacoes/nova-movimentacao";
import { resolverPeriodoDeParams } from "@/lib/dates";
import { requireSessao } from "@/lib/sessao";
import { listarContas } from "@/services/contas";
import { listarCategorias } from "@/services/categorias";
import { listarContatos } from "@/services/contatos";
import { listarLinhasDre } from "@/services/linhas-dre";
import { listarMovimentacoes, obterSaldoConta } from "@/services/movimentacoes";
import type { StatusMovimentacao, TipoMovimentacao } from "@/types/dominio";

type Props = {
  searchParams: Promise<{
    periodo?: string;
    de?: string;
    ate?: string;
    conta?: string;
    categoria?: string;
    tipo?: string;
    status?: string;
    busca?: string;
    semCategoria?: string;
  }>;
};

export default async function MovimentacoesPage({ searchParams }: Props) {
  const [params, { empresaAtiva }] = await Promise.all([searchParams, requireSessao()]);
  const periodo = resolverPeriodoDeParams(params);
  const somenteLeitura = empresaAtiva.papel === "LEITOR";

  const filtro = {
    de: periodo.de,
    ate: periodo.ate,
    contaId: params.conta,
    categoriaId: params.categoria,
    tipo: params.tipo as TipoMovimentacao | undefined,
    status: params.status as StatusMovimentacao | undefined,
    busca: params.busca,
    semCategoria: params.semCategoria === "1",
  };

  const [pagina, contas, categorias, contatos, linhas, saldoContaAncora] = await Promise.all([
    listarMovimentacoes(empresaAtiva.id, filtro),
    listarContas(empresaAtiva.id),
    listarCategorias(empresaAtiva.id),
    listarContatos(empresaAtiva.id),
    listarLinhasDre(),
    filtro.contaId ? obterSaldoConta(empresaAtiva.id, filtro.contaId) : Promise.resolve(null),
  ]);

  // Cartão não é dinheiro de verdade se movendo — não entra como opção de
  // conta aqui (nem pra lançar, nem pro filtro). Ele tem sua própria tela.
  const contasSemCartao = contas.filter((c) => c.tipo !== "CARTAO");

  return (
    <Container className="space-y-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-titulo font-semibold text-ink">Movimentações</h1>
        <BotaoNovaMovimentacao somenteLeitura={somenteLeitura} />
      </div>

      <PeriodPicker />
      <FiltrosMovimentacoes
        contas={contasSemCartao.map((c) => ({ id: c.id, nome: c.nome }))}
        categorias={categorias}
        linhas={linhas}
        tipoEspaco={empresaAtiva.tipo}
      />

      <p className="text-micro text-ink-muted">
        {pagina.total} {pagina.total === 1 ? "movimentação" : "movimentações"}
      </p>

      <ListaMovimentacoes
        key={JSON.stringify(filtro)}
        grupos={pagina.grupos}
        proximoCursor={pagina.proximoCursor}
        saldoContaAncora={saldoContaAncora}
        filtro={filtro}
        tipoEspaco={empresaAtiva.tipo}
        contas={contasSemCartao.map((c) => ({ id: c.id, nome: c.nome }))}
        categorias={categorias}
        contatos={contatos}
        linhas={linhas}
        somenteLeitura={somenteLeitura}
      />
    </Container>
  );
}
