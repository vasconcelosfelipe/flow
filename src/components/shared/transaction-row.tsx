"use client";

import { AlertCircle, Clock, Repeat } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { Checkbox } from "@/components/ui/checkbox";
import { iconeDe } from "@/lib/icones";
import { cn } from "@/lib/utils";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

export type TransactionRowProps = {
  movimentacao: MovimentacaoResumo;
  aoAbrir?: (id: string) => void;
  /** Quando definido, a linha entra em modo de seleção múltipla. */
  selecionada?: boolean;
  aoAlternarSelecao?: (id: string) => void;
};

/**
 * A linha mais repetida do produto — uma pessoa passa por centenas delas por
 * importação.
 *
 * Prioridade de leitura: valor primeiro (é o que se procura), depois descrição,
 * depois categoria. "Sem categoria" é tratado como pendência visível, não como
 * campo vazio, porque categorizar é o trabalho que a tela existe para provocar.
 */
export function TransactionRow({
  movimentacao,
  aoAbrir,
  selecionada,
  aoAlternarSelecao,
}: TransactionRowProps) {
  const { categoria, tipo, status } = movimentacao;
  const Icone = categoria ? iconeDe(categoria.icone) : AlertCircle;
  const receita = tipo === "RECEITA";
  const semCategoria = categoria === null;
  const emSelecao = aoAlternarSelecao !== undefined;
  const previsto = status === "PREVISTO" || status === "PENDENTE";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors",
        selecionada ? "bg-brand-wash" : "hover:bg-muted/60",
      )}
    >
      {emSelecao && (
        <Checkbox
          checked={selecionada}
          onCheckedChange={() => aoAlternarSelecao(movimentacao.id)}
          aria-label={`Selecionar ${movimentacao.descricao}`}
          className="size-5"
        />
      )}

      <button
        type="button"
        onClick={() => aoAbrir?.(movimentacao.id)}
        className="flex min-h-11 flex-1 items-center gap-3 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            semCategoria && "bg-attention-wash text-attention",
            previsto && !semCategoria && "border border-dashed",
          )}
          style={
            categoria && !previsto
              ? { backgroundColor: `${categoria.cor}1a`, color: categoria.cor }
              : previsto && categoria
                ? { borderColor: categoria.cor, color: categoria.cor }
                : undefined
          }
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
            {semCategoria ? (
              <span className="font-medium text-attention-text">Sem categoria</span>
            ) : (
              <span className="truncate">{categoria.nome}</span>
            )}
            {movimentacao.totalParcelas && (
              <span className="shrink-0">
                · {movimentacao.numeroParcela}/{movimentacao.totalParcelas}
              </span>
            )}
            {previsto && (
              <span className="flex shrink-0 items-center gap-0.5">
                <Clock className="size-3" aria-hidden="true" />
                {status === "PREVISTO" ? "Previsto" : "A pagar"}
              </span>
            )}
          </span>
        </span>

        <AmountText
          centavos={receita ? movimentacao.valorCentavos : -movimentacao.valorCentavos}
          className={cn(previsto && "opacity-60")}
        />
      </button>
    </div>
  );
}
