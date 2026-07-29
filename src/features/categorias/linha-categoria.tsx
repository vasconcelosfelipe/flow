"use client";

import { ChevronRight } from "lucide-react";

import { iconeDe } from "@/lib/icones";
import type { CategoriaCompleta } from "@/services/categorias/dto";

/**
 * A conta de DRE aparece como legenda, não como badge — é informação de
 * apoio (para onde a categoria soma), não um estado da categoria em si.
 */
export function LinhaCategoria({
  categoria,
  aoAbrir,
}: {
  categoria: CategoriaCompleta;
  aoAbrir: (id: string) => void;
}) {
  const Icone = iconeDe(categoria.icone);

  return (
    <button
      type="button"
      onClick={() => aoAbrir(categoria.id)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: `${categoria.cor}1a`, color: categoria.cor }}
      >
        <Icone className="size-4.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-corpo font-medium text-ink">{categoria.nome}</span>
        <span className="block truncate text-nano text-ink-muted">{categoria.linhaDreNome}</span>
      </span>

      {categoria.quantidadeMovimentacoes > 0 && (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-nano font-medium text-ink-muted">
          {categoria.quantidadeMovimentacoes}
        </span>
      )}

      <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
    </button>
  );
}
