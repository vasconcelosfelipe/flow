"use client";

import { AlertCircle, ArrowLeftRight, Clock, RefreshCw, Repeat } from "lucide-react";

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
 * Prioridade de leitura: descrição primeiro (é o que identifica o lançamento),
 * depois categoria — como uma pílula, igual uma etiqueta — e fornecedor,
 * depois o valor. "Sem categoria" é tratado como pendência visível, não como
 * campo vazio, porque categorizar é o trabalho que a tela existe para provocar.
 *
 * A descrição trunca (nunca quebra linha) e o valor nunca encolhe — sem isso
 * uma descrição longa empurra o valor pra fora do cartão em vez de cortar.
 */
export function TransactionRow({
  movimentacao,
  aoAbrir,
  selecionada,
  aoAlternarSelecao,
}: TransactionRowProps) {
  const { categoria, contato, tipo, status, transferenciaId } = movimentacao;
  const transferencia = transferenciaId !== null;
  const Icone = transferencia ? ArrowLeftRight : categoria ? iconeDe(categoria.icone) : AlertCircle;
  const receita = tipo === "RECEITA";
  const semCategoria = categoria === null && !transferencia;
  const emSelecao = aoAlternarSelecao !== undefined;
  const previsto = status === "PREVISTO" || status === "PENDENTE";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-4 transition-colors",
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
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            transferencia && "bg-brand-wash text-brand",
            semCategoria && "bg-attention-wash text-attention",
            previsto && !semCategoria && !transferencia && "border border-dashed",
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

        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-corpo font-medium text-ink">
              {movimentacao.descricao}
            </span>
            {movimentacao.recorrente && (
              <Repeat className="size-3 shrink-0 text-ink-muted" aria-label="Recorrente" />
            )}
            {movimentacao.origemFitId !== null && (
              <RefreshCw
                className="size-3 shrink-0 text-ink-muted"
                aria-label="Importado do extrato bancário"
              />
            )}
          </span>

          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {transferencia ? (
              <span className="inline-flex items-center rounded-full bg-brand-wash px-2 py-0.5 text-nano font-medium text-brand">
                Transferência entre contas
              </span>
            ) : semCategoria ? (
              <span className="text-nano font-medium text-attention-text">Sem categoria</span>
            ) : (
              <span
                className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-nano font-medium"
                style={{ backgroundColor: `${categoria!.cor}1a`, color: categoria!.cor }}
              >
                {categoria!.nome}
              </span>
            )}
            {contato && (
              <span className="truncate text-nano text-ink-muted">{contato.nome}</span>
            )}
            {movimentacao.totalParcelas && (
              <span className="shrink-0 text-nano text-ink-muted">
                · {movimentacao.numeroParcela}/{movimentacao.totalParcelas}
              </span>
            )}
            {previsto && (
              <span className="flex shrink-0 items-center gap-0.5 text-nano text-ink-muted">
                <Clock className="size-3" aria-hidden="true" />
                {status === "PREVISTO" ? "Previsto" : "A pagar"}
              </span>
            )}
          </span>
        </span>

        <AmountText
          centavos={receita ? movimentacao.valorCentavos : -movimentacao.valorCentavos}
          tom={transferencia ? "neutro" : "auto"}
          className={cn("shrink-0", previsto && "opacity-60")}
        />
      </button>
    </div>
  );
}
