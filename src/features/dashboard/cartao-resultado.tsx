"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AmountText } from "@/components/shared/amount-text";
import { formatarCompacto, formatarMoeda, type Centavos } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PontoAcumulado } from "@/services/dashboard/dto";

export type CartaoResultadoProps = {
  rotulo: string;
  receitas: Centavos;
  despesas: Centavos;
  acumulado: PontoAcumulado[];
  /**
   * `true` (padrão): card autônomo — fundo gradiente, cantos e sombra
   * próprios, para flutuar sobre canvas claro.
   * `false`: só o conteúdo, sem casca — para viver direto dentro de uma
   * seção escura de página, como no Início, onde o azul volta a ser o fundo
   * da tela em vez de um cartão dentro dela.
   */
  chrome?: boolean;
};

/**
 * O bloco-assinatura do Flow: a pergunta que o produto existe para responder
 * — o período fechou no azul ou no vermelho, e por qual composição.
 *
 * A curva é o resultado **acumulado**, não o diário. O valor de cada dia sobe
 * e desce sem contar história; o acumulado mostra a trajetória — se o período
 * está construindo lucro ou corroendo caixa.
 */
export function CartaoResultado({
  rotulo,
  receitas,
  despesas,
  acumulado,
  chrome = true,
}: CartaoResultadoProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const resultado = receitas - despesas;
  const lucro = resultado >= 0;

  const dados = acumulado.map((ponto) => ({
    rotulo: ponto.rotulo,
    valor: ponto.acumuladoCentavos / 100,
  }));

  return (
    <section
      className={cn(
        "overflow-hidden text-white",
        chrome && "rounded-2xl bg-linear-to-br from-brand-deep to-brand shadow-raised",
      )}
    >
      <div className={cn(chrome ? "p-5 pb-3" : "pb-3")}>
        <p className="text-nano font-semibold tracking-[0.14em] text-white/60 uppercase">
          {rotulo}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <AmountText centavos={resultado} tom="invertido" tamanho="hero" />
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-nano font-semibold",
              lucro ? "bg-positive text-white" : "bg-negative text-white",
            )}
          >
            {lucro ? "Lucro" : "Prejuízo"}
          </span>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
          <Composicao rotulo="Receitas" valor={receitas} cor="var(--positive)" />
          <Composicao rotulo="Despesas" valor={-despesas} cor="var(--negative)" />
        </dl>
      </div>

      <div className={cn("h-36 w-full", !chrome && "-mx-4")}>
        {montado && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradiente-acumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--positive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="rotulo" hide />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                cursor={{ stroke: "rgb(255 255 255 / 0.4)", strokeWidth: 1 }}
                content={<Dica />}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="var(--positive)"
                strokeWidth={2.5}
                fill="url(#gradiente-acumulado)"
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: chrome ? "var(--brand-deep)" : "var(--night)",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className={cn("text-nano text-white/50", chrome ? "px-5 pb-4" : "pt-1")}>
        Resultado acumulado ao longo do período
      </p>
    </section>
  );
}

function Composicao({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: Centavos;
  cor: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-nano tracking-wide text-white/60">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: cor }}
          aria-hidden="true"
        />
        {rotulo}
      </dt>
      <dd className="mt-0.5">
        <AmountText centavos={valor} tom="invertido" tamanho="md" />
      </dd>
    </div>
  );
}

type DicaProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ value?: number }>;
};

function Dica({ active, label, payload }: DicaProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl bg-night px-3 py-2 shadow-raised">
      <p className="text-nano text-night-muted">{label}</p>
      <p className="mt-0.5 font-mono text-micro font-medium text-white">
        {formatarMoeda(Math.round((payload[0].value ?? 0) * 100))}
      </p>
    </div>
  );
}

/** Exportado para o eixo do resumo anual reaproveitar a mesma formatação. */
export const formatarEixo = (valor: number) => formatarCompacto(valor * 100);
