"use client";

import { Building2, ChevronRight } from "lucide-react";

import { formatarData } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { EmpresaConsole } from "@/services/console/dto";

export function LinhaEmpresaConsole({
  empresa,
  aoAbrir,
}: {
  empresa: EmpresaConsole;
  aoAbrir: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(empresa.id)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          empresa.ativa ? "bg-brand-wash text-brand" : "bg-muted text-ink-muted",
        )}
      >
        <Building2 className="size-4.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-corpo font-medium text-ink">{empresa.nome}</span>
          {!empresa.ativa && (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-nano font-medium text-ink-muted">
              Inativa
            </span>
          )}
        </span>
        <span className="block truncate text-nano text-ink-muted">
          {empresa.cnpj ?? "Sem CNPJ"} · desde {formatarData(empresa.criadaEm)}
        </span>
      </span>

      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-nano font-medium text-ink-muted">
        {empresa.quantidadeUsuarios} {empresa.quantidadeUsuarios === 1 ? "usuário" : "usuários"}
      </span>

      <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
    </button>
  );
}
