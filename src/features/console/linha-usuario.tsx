"use client";

import { ChevronRight, ShieldCheck } from "lucide-react";

import { ROTULO_PAPEL } from "@/types/dominio";
import type { UsuarioConsole } from "@/services/console/dto";

export function LinhaUsuarioConsole({
  usuario,
  aoAbrir,
}: {
  usuario: UsuarioConsole;
  aoAbrir: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(usuario.id)}
      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-wash text-micro font-semibold text-brand">
        {usuario.nome.charAt(0).toUpperCase()}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-corpo font-medium text-ink">{usuario.nome}</span>
          {usuario.adminPlataforma && (
            <ShieldCheck className="size-3.5 shrink-0 text-brand" aria-label="Admin da plataforma" />
          )}
        </span>
        <span className="block truncate text-nano text-ink-muted">{usuario.email}</span>
      </span>

      <span className="shrink-0 text-right text-nano text-ink-muted">
        {usuario.empresas.length === 0
          ? "Sem empresa"
          : usuario.empresas.length === 1
            ? ROTULO_PAPEL[usuario.empresas[0].papel]
            : `${usuario.empresas.length} empresas`}
      </span>

      <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
    </button>
  );
}
