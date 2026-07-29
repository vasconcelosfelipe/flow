"use client";

import { AlertCircle, Repeat } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { Badge } from "@/components/ui/badge";
import { diasDeAtraso, formatarData } from "@/lib/dates";
import { iconeDe } from "@/lib/icones";
import { cn } from "@/lib/utils";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

/**
 * Linha de um título em aberto. Diferente da `TransactionRow`: aqui o que
 * importa não é quando entrou no extrato (ainda não entrou), é quando vence —
 * por isso a data ganha lugar fixo e um selo de urgência, em vez de viver
 * escondida atrás de "Previsto".
 */
export function LinhaPendencia({
  movimentacao,
  aoAbrir,
}: {
  movimentacao: MovimentacaoResumo;
  aoAbrir: (id: string) => void;
}) {
  const { categoria, tipo, dataVencimento } = movimentacao;
  const Icone = categoria ? iconeDe(categoria.icone) : AlertCircle;
  const receita = tipo === "RECEITA";
  const atraso = dataVencimento ? diasDeAtraso(dataVencimento) : null;

  return (
    <button
      type="button"
      onClick={() => aoAbrir(movimentacao.id)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-dashed"
        style={categoria ? { borderColor: categoria.cor, color: categoria.cor } : undefined}
      >
        <Icone className="size-4.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-corpo font-medium text-ink">
            {movimentacao.descricao}
          </span>
          {movimentacao.recorrente && (
            <Repeat className="size-3 shrink-0 text-ink-muted" aria-label="Recorrente" />
          )}
        </span>

        <span className="mt-0.5 flex items-center gap-1.5 text-nano text-ink-muted">
          {movimentacao.totalParcelas && (
            <span className="shrink-0">
              {movimentacao.numeroParcela}/{movimentacao.totalParcelas} ·{" "}
            </span>
          )}
          {dataVencimento && <span>Vence {formatarData(dataVencimento)}</span>}
        </span>
      </span>

      {atraso !== null && <SeloUrgencia atraso={atraso} />}

      <AmountText centavos={receita ? movimentacao.valorCentavos : -movimentacao.valorCentavos} />
    </button>
  );
}

function SeloUrgencia({ atraso }: { atraso: number }) {
  if (atraso > 0) {
    return (
      <Badge variant="destructive" className="shrink-0">
        {atraso}d atrasado
      </Badge>
    );
  }
  if (atraso === 0) {
    return (
      <Badge className={cn("shrink-0 bg-attention text-white")}>Hoje</Badge>
    );
  }
  return null;
}
