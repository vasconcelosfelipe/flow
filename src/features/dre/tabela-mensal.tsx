"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { calcularMargem, formatarPercentual } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DreResultado } from "@/services/dre/dto";

/**
 * A DRE é uma cascata: cada total nasce do anterior menos (ou mais) um
 * componente. A tela por isso é uma única faixa contínua, não cartões
 * soltos — o olho precisa descer a régua e sentir a subtração acontecendo.
 *
 * Dentro dela, dois pesos bem diferentes:
 * - Os totais (Receita Líquida, Margem de Contribuição, Resultado
 *   Operacional, Resultado Líquido) são o que a pessoa veio ler — sempre
 *   visíveis, sempre em destaque, nunca atrás de um toque.
 * - As linhas que os formam (Receita Bruta, Deduções, Custos, Despesas
 *   Operacionais, Outras Receitas/Despesas, Tributos) nascem discretas e
 *   fechadas; abrir uma revela as categorias reais por trás daquele
 *   número — nunca uma linha fictícia repetindo o nome da própria seção.
 *
 * Cada linha carrega também seu % sobre a receita líquida (análise
 * vertical clássica de DRE) — só faz sentido na visão mensal, onde há um
 * único valor por linha; na anual, doze colunas por linha já não cabem mais
 * um percentual do lado sem virar poluição visual.
 */
export function TabelaMensalDre({ dre }: { dre: DreResultado }) {
  const linha = (id: string) => dre.linhas.find((l) => l.id === id);
  const base = dre.receitaLiquida[0];
  const percentualDe = (centavos: number) => calcularMargem(centavos, base);
  const margemContribuicaoPercentual = dre.margemContribuicaoPercentual[0];
  const resultadoLiquidoPositivo = dre.resultadoLiquido[0] >= 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <LinhaComponente linha={linha("RECEITA_BRUTA")} percentual={percentualDe(linha("RECEITA_BRUTA")?.totalCentavos ?? 0)} />
      <LinhaComponente linha={linha("DEDUCOES")} percentual={percentualDe(linha("DEDUCOES")?.totalCentavos ?? 0)} />
      <LinhaTotal rotulo="Receita líquida" centavos={dre.receitaLiquida[0]} percentual={percentualDe(dre.receitaLiquida[0])} />

      <LinhaComponente linha={linha("CUSTOS")} percentual={percentualDe(linha("CUSTOS")?.totalCentavos ?? 0)} />
      <LinhaTotal rotulo="Margem de contribuição" centavos={dre.margemContribuicao[0]}>
        <span className="text-nano text-ink-muted">sobre a receita líquida</span>
        <span className="text-nano font-medium text-ink-muted">
          {margemContribuicaoPercentual === null ? "—" : formatarPercentual(margemContribuicaoPercentual)}
        </span>
      </LinhaTotal>

      <LinhaComponente linha={linha("DESPESAS_OPERACIONAIS")} percentual={percentualDe(linha("DESPESAS_OPERACIONAIS")?.totalCentavos ?? 0)} />
      <LinhaTotal rotulo="Resultado operacional" centavos={dre.resultadoOperacional[0]} percentual={percentualDe(dre.resultadoOperacional[0])} />

      <LinhaComponente linha={linha("OUTRAS_RECEITAS_DESPESAS")} percentual={percentualDe(linha("OUTRAS_RECEITAS_DESPESAS")?.totalCentavos ?? 0)} />
      <LinhaComponente linha={linha("TRIBUTOS_LUCRO")} percentual={percentualDe(linha("TRIBUTOS_LUCRO")?.totalCentavos ?? 0)} />

      <div
        className={cn(
          "flex items-center justify-between gap-2 px-4 py-5",
          resultadoLiquidoPositivo ? "bg-positive-wash" : "bg-negative-wash",
        )}
      >
        <span className="text-corpo font-semibold text-ink">Resultado líquido</span>
        <span className="flex flex-col items-end gap-0.5">
          <AmountText centavos={dre.resultadoLiquido[0]} tamanho="lg" />
          <Percentual valor={dre.margem[0]} />
        </span>
      </div>
    </div>
  );
}

/** `"—"` quando não há base (receita líquida zero) pra calcular sobre. */
function Percentual({ valor }: { valor: number | null }) {
  return (
    <span className="text-nano font-medium text-ink-muted">
      {valor === null ? "—" : formatarPercentual(valor)}
    </span>
  );
}

/** Uma linha da cascata — nasce fechada, some por trás de um toque. */
function LinhaComponente({
  linha,
  percentual,
}: {
  linha: DreResultado["linhas"][number] | undefined;
  percentual: number | null;
}) {
  const [aberto, setAberto] = useState(false);

  if (!linha) return null;

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
          aberto ? "bg-muted/40" : "hover:bg-muted/30",
        )}
      >
        <span className="flex items-center gap-1.5">
          <ChevronDown
            className={cn("size-3.5 text-ink-muted/70 transition-transform", aberto && "rotate-180")}
            aria-hidden="true"
          />
          <span className="text-micro text-ink-muted">{linha.nome}</span>
        </span>
        <span className="flex flex-col items-end gap-0.5 text-micro font-medium text-ink-muted">
          <AmountText centavos={linha.totalCentavos} tom="neutro" tamanho="sm" />
          <Percentual valor={percentual} />
        </span>
      </button>

      {aberto && (
        <div className="space-y-1.5 bg-muted/20 px-4 py-2.5 pl-9">
          {linha.itens.map((item) => (
            <div key={item.categoriaId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-micro text-ink-muted">
                  {item.tipo === "DESPESA" && "(-) "}
                  {item.nome}
                </span>
                <AmountText centavos={item.totalCentavos} tom="neutro" tamanho="sm" />
              </div>
              {item.subitens.map((sub) => (
                <div key={sub.categoriaId} className="flex items-center justify-between gap-2 pl-4">
                  <span className="text-nano text-ink-muted/80">
                    {sub.tipo === "DESPESA" && "(-) "}
                    {sub.nome}
                  </span>
                  <AmountText centavos={sub.totalCentavos} tom="neutro" tamanho="sm" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Um totalizador da cascata — sempre visível, sempre em destaque. Aceita uma
 * segunda linha opcional (a margem de contribuição em %, por exemplo): um
 * dado de apoio que pertence ao mesmo total, não um componente novo. Ou um
 * `percentual` simples (% sobre a receita líquida), quando não precisa do
 * rótulo extra que `children` carrega.
 */
function LinhaTotal({
  rotulo,
  centavos,
  percentual,
  children,
}: {
  rotulo: string;
  centavos: number;
  percentual?: number | null;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-2 border-b border-line bg-canvas/50 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{rotulo}</span>
        <span className="flex flex-col items-end gap-0.5">
          <AmountText centavos={centavos} tamanho="md" />
          {percentual !== undefined && <Percentual valor={percentual} />}
        </span>
      </div>
      {children && <div className="flex items-center justify-between gap-2">{children}</div>}
    </div>
  );
}
