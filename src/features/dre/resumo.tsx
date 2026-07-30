import { Percent, Scale, TrendingUp } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { formatarPercentual } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DreResultado } from "@/services/dre/dto";

function somar(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

/**
 * Os três números que respondem "como foi o período" antes de qualquer
 * linha da tabela — a tabela existe para explicar estes três, não o
 * contrário.
 */
export function ResumoDre({ dre }: { dre: DreResultado }) {
  const receitaLiquida = somar(dre.receitaLiquida);
  const resultadoLiquido = somar(dre.resultadoLiquido);
  const margemBp = receitaLiquida === 0 ? null : Math.round((resultadoLiquido / receitaLiquida) * 10_000);
  const positivo = resultadoLiquido >= 0;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
        <span className="grid size-7 place-items-center rounded-lg bg-brand-wash text-brand">
          <TrendingUp className="size-3.5" aria-hidden="true" />
        </span>
        <p className="mt-2.5 text-nano text-ink-muted">Receita líquida</p>
        <AmountText centavos={receitaLiquida} tom="neutro" tamanho="sm" className="mt-0.5 block" />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            positivo ? "bg-positive-wash text-positive-text" : "bg-negative-wash text-negative-text",
          )}
        >
          <Scale className="size-3.5" aria-hidden="true" />
        </span>
        <p className="mt-2.5 text-nano text-ink-muted">Resultado líquido</p>
        <AmountText centavos={resultadoLiquido} tamanho="sm" className="mt-0.5 block" />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
        <span className="grid size-7 place-items-center rounded-lg bg-attention-wash text-attention-text">
          <Percent className="size-3.5" aria-hidden="true" />
        </span>
        <p className="mt-2.5 text-nano text-ink-muted">Margem</p>
        <p
          className={cn(
            "mt-0.5 text-micro font-semibold",
            margemBp === null ? "text-ink-muted" : positivo ? "text-positive-text" : "text-negative-text",
          )}
        >
          {margemBp === null ? "—" : formatarPercentual(margemBp)}
        </p>
      </div>
    </div>
  );
}
