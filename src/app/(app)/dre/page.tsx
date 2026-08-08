import { parse } from "date-fns";

import { Container } from "@/components/layout/container";
import { FiltrosDre } from "@/features/dre/filtros";
import { ResumoDre } from "@/features/dre/resumo";
import { ListaDespesasPorCategoria } from "@/features/dre/resumo-despesas-categoria";
import { TabelaDre } from "@/features/dre/tabela";
import { mesesDoAno } from "@/lib/dates";
import { requireSessao } from "@/lib/sessao";
import { montarDre } from "@/services/dre";
import { montarResumoDespesasPorCategoria } from "@/services/dre/resumo-despesas-categoria";

type Props = {
  searchParams: Promise<{ modo?: string; mes?: string; ano?: string }>;
};

/**
 * Resultado do exercício, em duas leituras: o mês (composição) e o ano
 * (comparação). Mesma agregação por trás das duas — só o recorte de meses
 * passado para `montarDre` muda.
 */
export default async function DrePage({ searchParams }: Props) {
  const params = await searchParams;
  const modo = params.modo === "anual" ? "anual" : "mensal";

  const hoje = new Date();
  const mes = params.mes ? parse(params.mes, "yyyy-MM", hoje) : hoje;
  const ano = params.ano ? Number(params.ano) : hoje.getFullYear();
  const { empresaAtiva } = await requireSessao();
  const meses = modo === "mensal" ? [mes] : mesesDoAno(ano);

  if (empresaAtiva.tipo === "PESSOA_FISICA") {
    const resumo = await montarResumoDespesasPorCategoria(empresaAtiva.id, meses);
    return (
      <Container className="space-y-4 pt-5">
        <h1 className="text-titulo font-semibold text-ink">Resumo</h1>

        <FiltrosDre modo={modo} mes={mes} ano={ano} />

        <ListaDespesasPorCategoria resumo={resumo} />
      </Container>
    );
  }

  const dre = await montarDre(empresaAtiva.id, meses);

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">DRE</h1>

      <FiltrosDre modo={modo} mes={mes} ano={ano} />

      <ResumoDre dre={dre} />

      <TabelaDre dre={dre} />
    </Container>
  );
}
