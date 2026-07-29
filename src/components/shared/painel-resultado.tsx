import { TrendingDown, TrendingUp } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { formatarPercentual } from "@/lib/money";
import type { Centavos } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * `nu`   — sem fundo próprio, para viver dentro da zona escura do Início
 * `hero` — bloco de marca isolado, sobre canvas claro
 * `faixa`— totais no topo da DRE
 * `mini` — cabeçalho da lista quando há filtro ativo
 */
type Variante = "nu" | "hero" | "faixa" | "mini";

export type PainelResultadoProps = {
  receitas: Centavos;
  despesas: Centavos;
  rotulo: string;
  /** Variação sobre o período anterior, em basis points. */
  variacao?: number | null;
  variante?: Variante;
  className?: string;
};

/**
 * O elemento-assinatura do Flow: o resultado do período, a proporção que o
 * produziu, e nada mais.
 *
 * A barra não é decoração. A razão receita/despesa é a leitura mais rápida de
 * saúde do período — ela responde antes de o número ser lido, e é a mesma
 * forma que o símbolo da marca repete.
 */
export function PainelResultado({
  receitas,
  despesas,
  rotulo,
  variacao,
  variante = "hero",
  className,
}: PainelResultadoProps) {
  const resultado = receitas - despesas;
  const total = receitas + despesas;
  // Sem movimento no período a barra fica vazia, e não meio a meio: 50/50 sem
  // dado nenhum sugeriria equilíbrio onde não há informação.
  const proporcaoReceita = total === 0 ? 0 : (receitas / total) * 100;

  const nu = variante === "nu";
  const mini = variante === "mini";
  const faixa = variante === "faixa";

  return (
    <section
      className={cn(
        "relative text-white",
        !nu && "overflow-hidden bg-linear-to-br from-brand-deep to-brand shadow-card",
        !nu && (mini ? "rounded-xl px-4 py-3" : "rounded-2xl p-5"),
        className,
      )}
    >
      <div className={cn(faixa && "flex flex-wrap items-end justify-between gap-4")}>
        <p
          className={cn(
            "font-medium tracking-[0.14em] text-white/55 uppercase",
            mini ? "text-[10px]" : "text-nano",
          )}
        >
          {rotulo}
        </p>

        <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", mini ? "mt-0.5" : "mt-1.5")}>
          <AmountText
            centavos={resultado}
            tom="invertido"
            tamanho={mini ? "lg" : "hero"}
          />
          {variacao != null && <Variacao basisPoints={variacao} />}
        </div>
      </div>

      <div className={cn(mini ? "mt-3" : "mt-5")}>
        {!mini && (
          <dl className="mb-2 flex items-end justify-between gap-4">
            <Lado
              rotulo="Receitas"
              valor={receitas}
              cor="var(--positive)"
              percentual={total === 0 ? null : Math.round(proporcaoReceita)}
              alinhamento="esquerda"
            />
            <Lado
              rotulo="Despesas"
              valor={despesas}
              cor="var(--negative)"
              percentual={total === 0 ? null : 100 - Math.round(proporcaoReceita)}
              alinhamento="direita"
            />
          </dl>
        )}

        {/* Duas faixas proporcionais, nas mesmas cores que receita e despesa
            têm em todo o resto do produto. A barra deixa de precisar de
            legenda: ela é a mesma leitura dos números logo acima, em largura. */}
        <div
          className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/10"
          role="img"
          aria-label={
            total === 0
              ? "Sem movimentação no período"
              : `Receitas ocupam ${Math.round(proporcaoReceita)}% e despesas ${100 - Math.round(proporcaoReceita)}% do movimento do período`
          }
        >
          <div
            className="h-full rounded-full bg-positive transition-[width] duration-500 ease-out"
            style={{ width: `${proporcaoReceita}%` }}
          />
          <div
            className="h-full flex-1 rounded-full bg-negative transition-[width] duration-500 ease-out"
            style={{ width: `${100 - proporcaoReceita}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function Lado({
  rotulo,
  valor,
  cor,
  percentual,
  alinhamento,
}: {
  rotulo: string;
  valor: Centavos;
  cor: string;
  percentual: number | null;
  alinhamento: "esquerda" | "direita";
}) {
  const direita = alinhamento === "direita";

  return (
    <div className={direita ? "text-right" : undefined}>
      <dt
        className={cn(
          "flex items-center gap-1.5 text-nano tracking-wide text-white/60",
          direita && "flex-row-reverse",
        )}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: cor }}
          aria-hidden="true"
        />
        {rotulo}
        {percentual !== null && <span className="text-white/40">{percentual}%</span>}
      </dt>
      <dd className="mt-0.5">
        <AmountText centavos={valor} tom="invertido" tamanho="md" />
      </dd>
    </div>
  );
}

function Variacao({ basisPoints }: { basisPoints: number }) {
  const subiu = basisPoints >= 0;
  const Icone = subiu ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-nano font-semibold",
        subiu ? "bg-positive/25 text-white" : "bg-negative/30 text-white",
      )}
    >
      <Icone className="size-3" aria-hidden="true" />
      {formatarPercentual(Math.abs(basisPoints))}
      <span className="sr-only">
        {subiu ? "acima" : "abaixo"} do período anterior
      </span>
    </span>
  );
}
