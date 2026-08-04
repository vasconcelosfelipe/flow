import { Activity, Scale, TrendingUp } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { calcularMargem, formatarPercentual } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DreResultado } from "@/services/dre/dto";

function somar(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

/**
 * Os três números que respondem "como foi o período" antes de qualquer
 * linha da tabela — a tabela existe para explicar estes três, não o
 * contrário. Receita Bruta é o topo da cascata (100% de referência);
 * Resultado Operacional e Resultado Líquido levam o % sobre ela, mesma base
 * da análise vertical da tabela mensal logo abaixo.
 */
export function ResumoDre({ dre }: { dre: DreResultado }) {
  const receitaBruta = somar(dre.receitaBruta);
  const resultadoOperacional = somar(dre.resultadoOperacional);
  const resultadoLiquido = somar(dre.resultadoLiquido);

  const percentualOperacional = calcularMargem(resultadoOperacional, receitaBruta);
  const percentualLiquido = calcularMargem(resultadoLiquido, receitaBruta);

  const operacionalPositivo = resultadoOperacional >= 0;
  const liquidoPositivo = resultadoLiquido >= 0;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
        <span className="grid size-7 place-items-center rounded-lg bg-brand-wash text-brand">
          <TrendingUp className="size-3.5" aria-hidden="true" />
        </span>
        <p className="mt-2.5 text-nano text-ink-muted">Receita bruta</p>
        <AmountText centavos={receitaBruta} tom="neutro" tamanho="sm" className="mt-0.5 block" />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            operacionalPositivo ? "bg-positive-wash text-positive-text" : "bg-negative-wash text-negative-text",
          )}
        >
          <Activity className="size-3.5" aria-hidden="true" />
        </span>
        <p className="mt-2.5 text-nano text-ink-muted">Resultado operacional</p>
        <AmountText centavos={resultadoOperacional} tamanho="sm" className="mt-0.5 block" />
        <p
          className={cn(
            "mt-0.5 text-nano font-medium",
            percentualOperacional === null
              ? "text-ink-muted"
              : operacionalPositivo
                ? "text-positive-text"
                : "text-negative-text",
          )}
        >
          {percentualOperacional === null ? "—" : formatarPercentual(percentualOperacional)}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            liquidoPositivo ? "bg-positive-wash text-positive-text" : "bg-negative-wash text-negative-text",
          )}
        >
          <Scale className="size-3.5" aria-hidden="true" />
        </span>
        <p className="mt-2.5 text-nano text-ink-muted">Resultado líquido</p>
        <AmountText centavos={resultadoLiquido} tamanho="sm" className="mt-0.5 block" />
        <p
          className={cn(
            "mt-0.5 text-nano font-medium",
            percentualLiquido === null ? "text-ink-muted" : liquidoPositivo ? "text-positive-text" : "text-negative-text",
          )}
        >
          {percentualLiquido === null ? "—" : formatarPercentual(percentualLiquido)}
        </p>
      </div>
    </div>
  );
}
