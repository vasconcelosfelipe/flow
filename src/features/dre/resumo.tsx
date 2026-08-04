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
 * contrário. Uma faixa só, três colunas divididas por um traço — não três
 * cartões com sombra própria competindo por atenção lado a lado, que é o
 * que ficava empilhado e apertado.
 *
 * Receita Bruta é o topo da cascata: sempre 100%, mostrado como pílula pra
 * deixar explícito que os outros dois percentuais nascem dali — mesma base
 * da análise vertical da tabela mensal logo abaixo.
 */
export function ResumoDre({ dre }: { dre: DreResultado }) {
  const receitaBruta = somar(dre.receitaBruta);
  const resultadoOperacional = somar(dre.resultadoOperacional);
  const resultadoLiquido = somar(dre.resultadoLiquido);

  const percentualOperacional = calcularMargem(resultadoOperacional, receitaBruta);
  const percentualLiquido = calcularMargem(resultadoLiquido, receitaBruta);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="grid grid-cols-3 divide-x divide-line">
        <Coluna rotulo="Receita bruta" centavos={receitaBruta}>
          <PercentualPill valor={10_000} />
        </Coluna>
        <Coluna rotulo="Result. operacional" centavos={resultadoOperacional}>
          <PercentualPill valor={percentualOperacional} />
        </Coluna>
        <Coluna rotulo="Result. líquido" centavos={resultadoLiquido}>
          <PercentualPill valor={percentualLiquido} />
        </Coluna>
      </div>
    </div>
  );
}

function Coluna({
  rotulo,
  centavos,
  children,
}: {
  rotulo: string;
  centavos: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 p-3 text-center">
      <p className="text-nano text-ink-muted">{rotulo}</p>
      <AmountText centavos={centavos} tamanho="sm" className="block" />
      {children}
    </div>
  );
}

function PercentualPill({ valor }: { valor: number | null }) {
  if (valor === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-nano font-medium text-ink-muted">
        —
      </span>
    );
  }
  const positivo = valor >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-nano font-medium",
        positivo ? "bg-positive-wash text-positive-text" : "bg-negative-wash text-negative-text",
      )}
    >
      {formatarPercentual(valor)}
    </span>
  );
}
