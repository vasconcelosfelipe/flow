import Link from "next/link";
import { Receipt } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { EmptyState } from "@/components/shared/empty-state";
import { chaveDia, fimMes, inicioMes } from "@/lib/dates";
import { iconeDe } from "@/lib/icones";
import { formatarPercentual } from "@/lib/money";
import type { ResumoDespesasPorCategoria } from "@/services/dre/dto";

/**
 * Substitui `<ResumoDre>` + `<TabelaDre>` pra espaços `PESSOA_FISICA`: uma
 * lista simples de categorias de despesa do período, maior gasto primeiro,
 * cada uma com a própria cor como identidade — mesmo padrão visual de
 * `TransactionRow`/pílula de categoria, sem gráfico novo. Cada linha leva
 * pra Movimentações já filtrada pelo mesmo período (mês ou ano, conforme o
 * modo escolhido em `<FiltrosDre>`) e pela categoria clicada.
 */
export function ListaDespesasPorCategoria({ resumo }: { resumo: ResumoDespesasPorCategoria }) {
  const de = chaveDia(inicioMes(resumo.meses[0]));
  const ate = chaveDia(fimMes(resumo.meses[resumo.meses.length - 1]));

  if (resumo.itens.length === 0) {
    return (
      <EmptyState
        icone={Receipt}
        titulo="Sem despesas no período"
        descricao="Categorize suas movimentações pra ver o resumo aparecer aqui."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 text-center shadow-card">
        <p className="text-nano text-ink-muted">Total de despesas</p>
        <AmountText centavos={-resumo.totalCentavos} tamanho="lg" className="mt-1 block" />
      </div>

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {resumo.itens.map((item) => {
          const Icone = iconeDe(item.icone);
          return (
            <Link
              key={item.categoriaId}
              href={`/movimentacoes?de=${de}&ate=${ate}&categoria=${item.categoriaId}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: `${item.cor}1a`, color: item.cor }}
              >
                <Icone className="size-4.5" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-corpo font-medium text-ink">
                    {item.nome}
                  </span>
                  <AmountText centavos={-item.totalCentavos} tamanho="sm" className="shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.percentual * 100}%`, backgroundColor: item.cor }}
                    />
                  </div>
                  <span className="shrink-0 text-nano text-ink-muted">
                    {formatarPercentual(item.percentual * 10_000)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
