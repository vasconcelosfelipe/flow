"use client";

import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { EmpresaResumo } from "@/services/empresas/dto";
import { ROTULO_PAPEL } from "@/types/dominio";

export type EmpresaSwitcherProps = {
  empresas: EmpresaResumo[];
  ativa: EmpresaResumo;
  /** O Console só aparece para quem administra a plataforma. */
  mostrarConsole?: boolean;
};

/**
 * Trocar de empresa é uma mudança de contexto inteira: muda o saldo, a DRE,
 * cada lançamento da tela. Por isso fica no topo, sempre visível e sempre no
 * mesmo lugar — nunca escondido dentro de configurações.
 *
 * Com uma empresa só, o controle vira um rótulo estático: não há troca a
 * oferecer, e um menu que abre com uma opção é ruído.
 */
export function EmpresaSwitcher({
  empresas,
  ativa,
  mostrarConsole = false,
}: EmpresaSwitcherProps) {
  const router = useRouter();
  const unica = empresas.length <= 1;

  if (unica && !mostrarConsole) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-micro font-medium text-night-text">
        <Building2 className="size-3.5 shrink-0 text-night-muted" aria-hidden="true" />
        <span className="truncate">{ativa.nome}</span>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex min-h-9 min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-micro font-medium text-night-text transition-colors",
          "hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none",
        )}
      >
        <Building2 className="size-3.5 shrink-0 text-night-muted" aria-hidden="true" />
        <span className="truncate">{ativa.nome}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-night-muted" aria-hidden="true" />
        <span className="sr-only">Trocar de empresa</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[11px] text-ink-muted">
          Suas empresas
        </DropdownMenuLabel>

        {empresas.map((empresa) => {
          const selecionada = empresa.id === ativa.id;
          return (
            <DropdownMenuItem
              key={empresa.id}
              onSelect={() => router.push(`/?empresa=${empresa.slug}`)}
              className="gap-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{empresa.nome}</span>
                <span className="block text-[11px] text-ink-muted">
                  {ROTULO_PAPEL[empresa.papel]}
                </span>
              </span>
              {selecionada && <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}

        {mostrarConsole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/console/empresas")}>
              Console da plataforma
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
