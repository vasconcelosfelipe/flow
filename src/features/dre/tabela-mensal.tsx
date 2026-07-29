"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { formatarPercentual } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ChaveSecaoDre, DreResultado } from "@/services/dre/dto";

/**
 * A DRE é uma cascata: cada total nasce do anterior menos (ou mais) um
 * componente. A tela por isso é uma única faixa contínua, não cartões
 * soltos — o olho precisa descer a régua e sentir a subtração acontecendo.
 *
 * Dentro dela, dois pesos bem diferentes:
 * - Os totais (Receita Líquida, Lucro Bruto, Lucro Antes dos Tributos,
 *   Lucro Líquido) são o que a pessoa veio ler — sempre visíveis, sempre em
 *   destaque, nunca atrás de um toque.
 * - Os componentes que os formam (Receita Bruta, Deduções, Custos,
 *   Despesas Operacionais, Resultado Não Operacional, Tributos) nascem
 *   discretos e fechados; abrir um revela as categorias reais por trás
 *   daquele número, nunca a categoria de outra seção.
 */
export function TabelaMensalDre({ dre }: { dre: DreResultado }) {
  const secao = (c: ChaveSecaoDre) => dre.secoes.find((s) => s.chave === c);
  const margemContribuicao = dre.margemContribuicao[0];
  const lucroLiquidoPositivo = dre.lucroLiquido[0] >= 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <LinhaComponente secao={secao("RECEITA_BRUTA")} />
      <LinhaComponente secao={secao("DEDUCOES")} />

      <LinhaTotal rotulo="Receita líquida" centavos={dre.receitaLiquida[0]}>
        <span className="text-nano text-ink-muted">Margem de contribuição</span>
        <span className="text-nano font-medium text-ink-muted">
          {margemContribuicao === null ? "—" : formatarPercentual(margemContribuicao)}
        </span>
      </LinhaTotal>

      <LinhaComponente secao={secao("CUSTOS")} />
      <LinhaComponente secao={secao("DESPESAS_OPERACIONAIS")} />
      <LinhaTotal rotulo="Lucro bruto" centavos={dre.lucroBruto[0]} />

      <LinhaComponente secao={secao("RESULTADO_NAO_OPERACIONAL")} />
      <LinhaTotal rotulo="Lucro antes dos tributos" centavos={dre.lucroAntesTributos[0]} />

      <LinhaComponente secao={secao("TRIBUTOS_LUCRO")} />

      <div
        className={cn(
          "flex items-center justify-between gap-2 px-4 py-5",
          lucroLiquidoPositivo ? "bg-positive-wash" : "bg-negative-wash",
        )}
      >
        <span className="text-corpo font-semibold text-ink">Lucro líquido</span>
        <AmountText centavos={dre.lucroLiquido[0]} tamanho="lg" />
      </div>
    </div>
  );
}

/** Um componente da cascata — nasce fechado, some por trás de um toque. */
function LinhaComponente({ secao }: { secao: DreResultado["secoes"][number] | undefined }) {
  const [aberto, setAberto] = useState(false);

  if (!secao) return null;

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
          <span className="text-micro text-ink-muted">{secao.rotulo}</span>
        </span>
        <span className="text-micro font-medium text-ink-muted">
          <AmountText centavos={secao.totalCentavos} tom="neutro" tamanho="sm" />
        </span>
      </button>

      {aberto && (
        <div className="space-y-1.5 bg-muted/20 px-4 py-2.5 pl-9">
          {secao.linhas.map((linha) => (
            <div key={linha.id} className="flex items-center justify-between gap-2">
              <span className="text-micro text-ink-muted">
                {linha.sinal === -1 && "(-) "}
                {linha.nome}
              </span>
              <AmountText centavos={linha.valores[0]} tom="neutro" tamanho="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Um totalizador da cascata — sempre visível, sempre em destaque. Aceita uma
 * segunda linha opcional (a margem de contribuição, por exemplo): um dado de
 * apoio que pertence ao mesmo total, não um componente novo, então ganha
 * respiro próprio dentro do mesmo bloco em vez de espremer contra a linha
 * de cima.
 */
function LinhaTotal({
  rotulo,
  centavos,
  children,
}: {
  rotulo: string;
  centavos: number;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-2 border-b border-line bg-canvas/50 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{rotulo}</span>
        <AmountText centavos={centavos} tamanho="md" />
      </div>
      {children && <div className="flex items-center justify-between gap-2">{children}</div>}
    </div>
  );
}
