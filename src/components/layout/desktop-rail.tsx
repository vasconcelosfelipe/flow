"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoMark } from "@/components/layout/logo";
import { DESTINOS, destinoAtivo } from "@/components/layout/navegacao";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TipoEmpresa } from "@/types/dominio";

/**
 * No desktop a barra inferior vira um rail estreito, mantendo os mesmos cinco
 * destinos na mesma ordem. O app cresce de tamanho sem virar outro produto —
 * quem aprendeu no celular não reaprende nada aqui.
 */
export function DesktopRail({ tipoEspaco }: { tipoEspaco: TipoEmpresa }) {
  const pathname = usePathname();
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

      {destinos.map((destino) => {
        const ativo = destinoAtivo(pathname, destino);
        const Icone = destino.icone;

        return (
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
      })}
    </nav>
  );
}
