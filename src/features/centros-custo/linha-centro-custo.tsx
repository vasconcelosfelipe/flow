"use client";

import { ChevronRight, Tag } from "lucide-react";

import type { CentroCustoCompleto } from "@/services/centros-custo/dto";

export function LinhaCentroCusto({
  centro,
  aoAbrir,
}: {
  centro: CentroCustoCompleto;
  aoAbrir: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(centro.id)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: `${centro.cor}1a`, color: centro.cor }}
      >
        <Tag className="size-4.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 text-corpo font-medium text-ink">{centro.nome}</span>

      {centro.quantidadeMovimentacoes > 0 && (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-nano font-medium text-ink-muted">
          {centro.quantidadeMovimentacoes}
        </span>
      )}

      <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
    </button>
  );
}
