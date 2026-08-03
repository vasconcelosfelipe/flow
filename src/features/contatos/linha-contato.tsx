"use client";

import { ChevronRight, Handshake } from "lucide-react";

import type { ContatoCompleto } from "@/services/contatos/dto";

export function LinhaContato({
  contato,
  aoAbrir,
}: {
  contato: ContatoCompleto;
  aoAbrir: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(contato.id)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
        <Handshake className="size-4.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-corpo font-medium text-ink">{contato.nome}</span>
        {contato.documento && (
          <span className="block truncate text-nano text-ink-muted">{contato.documento}</span>
        )}
      </span>

      {contato.quantidadeMovimentacoes > 0 && (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-nano font-medium text-ink-muted">
          {contato.quantidadeMovimentacoes}
        </span>
      )}

      <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
    </button>
  );
}
