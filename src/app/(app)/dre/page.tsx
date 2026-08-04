import { parse } from "date-fns";

import { Container } from "@/components/layout/container";
import { FiltrosDre } from "@/features/dre/filtros";
import { ResumoDre } from "@/features/dre/resumo";
import { TabelaDre } from "@/features/dre/tabela";
import { mesesDoAno } from "@/lib/dates";
import { requireSessao } from "@/lib/sessao";
import { montarDre } from "@/services/dre";

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

  const dre = await (modo === "mensal"
    ? montarDre(empresaAtiva.id, [mes])
    : montarDre(empresaAtiva.id, mesesDoAno(ano)));

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">DRE</h1>

      <FiltrosDre modo={modo} mes={mes} ano={ano} />

      <ResumoDre dre={dre} />

      <TabelaDre dre={dre} />
    </Container>
  );
}
