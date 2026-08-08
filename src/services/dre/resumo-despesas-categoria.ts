import { isSameMonth } from "date-fns";

import { db } from "@/lib/db";
import type { ChaveIcone } from "@/lib/icones";
import type { ItemResumoDespesaCategoria, ResumoDespesasPorCategoria } from "@/services/dre/dto";

/**
 * Substitui `montarDre` pra espaços `PESSOA_FISICA`: mesma fonte de dados
 * (Movimentacao paga/conciliada, dentro do recorte de meses), mas agrupada
 * direto por categoria em vez de pela cascata de LinhaDre — não faz sentido
 * pedir pra uma pessoa física configurar "Receita Bruta"/"Custos"/etc.
 * 100% orientado a dado, igual a DRE: nenhuma categoria fica hardcoded aqui.
 */
export async function montarResumoDespesasPorCategoria(
  empresaId: string,
  meses: Date[],
): Promise<ResumoDespesasPorCategoria> {
  const movimentacoes = await db.movimentacao.findMany({
    where: {
      empresaId,
      tipo: "DESPESA",
      status: { in: ["PAGO", "CONCILIADO"] },
      data: { not: null },
    },
    select: {
      valorCentavos: true,
      data: true,
      categoria: { select: { id: true, nome: true, cor: true, icone: true } },
    },
  });

  const porCategoria = new Map<string, ItemResumoDespesaCategoria>();

  for (const mov of movimentacoes) {
    const categoria = mov.categoria;
    if (!categoria || !mov.data) continue; // sem categoria: fora do resumo

    const dentroDoPeriodo = meses.some((m) => isSameMonth(m, mov.data!));
    if (!dentroDoPeriodo) continue;

    let item = porCategoria.get(categoria.id);
    if (!item) {
      item = {
        categoriaId: categoria.id,
        nome: categoria.nome,
        cor: categoria.cor,
        icone: categoria.icone as ChaveIcone,
        totalCentavos: 0,
        percentual: 0,
      };
      porCategoria.set(categoria.id, item);
    }
    item.totalCentavos += mov.valorCentavos;
  }

  const itens = [...porCategoria.values()].sort((a, b) => b.totalCentavos - a.totalCentavos);
  const totalCentavos = itens.reduce((soma, item) => soma + item.totalCentavos, 0);

  for (const item of itens) {
    item.percentual = totalCentavos > 0 ? item.totalCentavos / totalCentavos : 0;
  }

  return { meses, itens, totalCentavos };
}
