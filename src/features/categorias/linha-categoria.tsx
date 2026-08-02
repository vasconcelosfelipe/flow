"use client";

import { ChevronRight, CornerDownRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { iconeDe } from "@/lib/icones";
import type { CategoriaCompleta } from "@/services/categorias/dto";

/**
 * A conta de DRE aparece como legenda, não como badge — é informação de
 * apoio (para onde a categoria soma), não um estado da categoria em si.
 *
 * Subcategoria entra recuada e com ícone menor, sinalizando hierarquia sem
 * precisar de uma segunda lista separada — a pessoa lê a família de
 * categorias inteira de uma vez.
 */
export function LinhaCategoria({
  categoria,
  subcategoria = false,
  aoAbrir,
}: {
  categoria: CategoriaCompleta;
  subcategoria?: boolean;
  aoAbrir: (id: string) => void;
}) {
  const Icone = iconeDe(categoria.icone);

  return (
    <button
      type="button"
      onClick={() => aoAbrir(categoria.id)}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
        subcategoria && "pl-10",
      )}
    >
      {subcategoria && (
        <CornerDownRight className="size-3.5 shrink-0 text-ink-muted/50" aria-hidden="true" />
      )}

      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl",
          subcategoria ? "size-8" : "size-10",
        )}
        style={{ backgroundColor: `${categoria.cor}1a`, color: categoria.cor }}
      >
        <Icone className={cn(subcategoria ? "size-4" : "size-4.5")} aria-hidden="true" />
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
