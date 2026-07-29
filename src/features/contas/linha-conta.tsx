"use client";

import { ChevronRight } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { iconeDeConta } from "@/lib/icones-conta";
import { ROTULO_TIPO_CONTA } from "@/types/dominio";
import type { ContaCompleta } from "@/services/contas/dto";

export function LinhaConta({
  conta,
  aoAbrir,
}: {
  conta: ContaCompleta;
  aoAbrir: (id: string) => void;
}) {
  const Icone = iconeDeConta(conta.tipo);

  return (
    <button
      type="button"
      onClick={() => aoAbrir(conta.id)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: `${conta.cor}1a`, color: conta.cor }}
      >
        <Icone className="size-4.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-corpo font-medium text-ink">{conta.nome}</span>
        <span className="block truncate text-nano text-ink-muted">
          {ROTULO_TIPO_CONTA[conta.tipo]}
        </span>
      </span>

      <AmountText centavos={conta.saldoCentavos} tom="neutro" tamanho="sm" />

      <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
    </button>
  );
}
