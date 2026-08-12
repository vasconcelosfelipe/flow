"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AmountText } from "@/components/shared/amount-text";
import { EmptyState } from "@/components/shared/empty-state";
import { iconeDe } from "@/lib/icones";
import { formatarMoeda, formatarPercentual } from "@/lib/money";
import type { ItemDespesaCategoria } from "@/services/dashboard/dto";
import { PieChart as PieChartIcon } from "lucide-react";

export type CartaoDespesasCategoriaProps = {
  rotulo: string;
  itens: ItemDespesaCategoria[];
};

/**
 * Substitui o card de Resultado no espaço pessoal: "lucro"/"prejuízo" é
 * linguagem de empresa, mas "pra onde foi meu dinheiro" é a pergunta de
 * quem controla as próprias finanças — por isso um gráfico de participação
 * por categoria, não uma curva de resultado acumulado.
 *
 * Mesmo princípio 100% orientado a dado da DRE/resumo: nenhuma categoria
 * fica hardcoded, a cor de cada fatia é a cor cadastrada da categoria.
 */
export function CartaoDespesasCategoria({ rotulo, itens }: CartaoDespesasCategoriaProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const total = itens.reduce((soma, item) => soma + item.totalCentavos, 0);

  if (itens.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <p className="text-nano font-semibold tracking-[0.14em] text-ink-muted uppercase">
          {rotulo}
        </p>
        <EmptyState
          icone={PieChartIcon}
          titulo="Sem despesas categorizadas"
          descricao="Categorize seus gastos do período pra ver a participação de cada um aqui."
          className="mt-2"
        />
      </section>
    );
  }

  const dados = itens.map((item) => ({ ...item, valor: item.totalCentavos / 100 }));

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <p className="text-nano font-semibold tracking-[0.14em] text-ink-muted uppercase">
        {rotulo}
      </p>
      <AmountText centavos={-total} tamanho="hero" className="mt-1.5" />

      <div className="mt-4 flex items-center gap-4">
        <div className="h-32 w-32 shrink-0">
          {montado && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={dados.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {dados.map((item) => (
                    <Cell key={item.categoriaId} fill={item.cor} />
                  ))}
                </Pie>
                <Tooltip content={<Dica />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <dl className="min-w-0 flex-1 space-y-2.5">
          {itens.slice(0, 5).map((item) => {
            const Icone = iconeDe(item.icone);
            return (
              <div key={item.categoriaId} className="flex items-center gap-2">
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-md"
                  style={{ backgroundColor: `${item.cor}1a`, color: item.cor }}
                >
                  <Icone className="size-3.5" aria-hidden="true" />
                </span>
                <dt className="min-w-0 flex-1 truncate text-micro text-ink">{item.nome}</dt>
                <dd className="shrink-0 text-micro font-semibold text-ink-muted">
                  {formatarPercentual(item.percentual * 10_000)}
                </dd>
              </div>
            );
          })}
          {itens.length > 5 && (
            <p className="text-nano text-ink-muted">+{itens.length - 5} outras categorias</p>
          )}
        </dl>
      </div>
    </section>
  );
}

type DicaProps = {
  active?: boolean;
  payload?: Array<{ payload?: ItemDespesaCategoria }>;
};

function Dica({ active, payload }: DicaProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="rounded-xl bg-night px-3 py-2 shadow-raised">
      <p className="text-nano text-night-muted">{item.nome}</p>
      <p className="mt-0.5 font-mono text-micro font-medium text-white">
        {formatarMoeda(item.totalCentavos)}
      </p>
    </div>
  );
}
