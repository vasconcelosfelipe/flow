"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { LogoMark } from "@/components/layout/logo";
import { DESTINOS, destinoAtivo } from "@/components/layout/navegacao";
import { useNovoLancamento } from "@/components/layout/novo-lancamento-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TipoEmpresa } from "@/types/dominio";

/**
 * No desktop a barra inferior vira um rail estreito, mantendo os mesmos
 * destinos na mesma ordem — o app cresce de tamanho sem virar outro
 * produto, quem aprendeu no celular não reaprende nada aqui. O "+" (abre o
 * modal global de novo lançamento, não navega) entra na mesma posição
 * central que ocupa na barra inferior.
 */
export function DesktopRail({
  tipoEspaco,
  somenteLeitura = false,
}: {
  tipoEspaco: TipoEmpresa;
  somenteLeitura?: boolean;
}) {
  const pathname = usePathname();
  const { abrir } = useNovoLancamento();
  const destinos = DESTINOS.map((d) =>
    d.href === "/dre" && tipoEspaco === "PESSOA_FISICA" ? { ...d, rotulo: "Resumo" } : d,
  );

  return (
    <nav
      className="fixed inset-y-0 left-0 z-50 hidden w-16 flex-col items-center gap-1 bg-night py-4 md:flex"
      aria-label="Navegação principal"
    >
      <Link
        href="/"
        className="mb-3 rounded-xl focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
      >
        <LogoMark />
        <span className="sr-only">Flow — início</span>
      </Link>

      {destinos.flatMap((destino, i) => {
        const ativo = destinoAtivo(pathname, destino);
        const Icone = destino.icone;

        const link = (
          <Tooltip key={destino.href}>
            <TooltipTrigger asChild>
              <Link
                href={destino.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "grid size-11 place-items-center rounded-xl transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none",
                  ativo
                    ? "bg-brand text-white shadow-night"
                    : "text-night-muted hover:bg-white/10 hover:text-night-text",
                )}
              >
                <Icone className="size-5" aria-hidden="true" />
                <span className="sr-only">{destino.rotulo}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{destino.rotulo}</TooltipContent>
          </Tooltip>
        );

        if (i !== 2) return [link];
        return [
          <Tooltip key="novo-lancamento">
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={abrir}
                disabled={somenteLeitura}
                aria-label="Novo lançamento"
                className="grid size-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-night transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:opacity-40"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Novo lançamento</TooltipContent>
          </Tooltip>,
          link,
        ];
      })}
    </nav>
  );
}
