"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { DESTINOS, destinoAtivo } from "@/components/layout/navegacao";
import { cn } from "@/lib/utils";

/**
 * Barra inferior fixa — o polegar alcança tudo sem reposicionar a mão.
 *
 * O indicador é um único elemento que desliza entre destinos (`layoutId`), em
 * vez de aparecer e sumir: o movimento conta de onde a pessoa veio, o que
 * torna a navegação legível sem exigir leitura do rótulo.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur-sm md:hidden"
      aria-label="Navegação principal"
    >
      <ul className="flex items-stretch justify-around px-1">
        {DESTINOS.map((destino) => {
          const ativo = destinoAtivo(pathname, destino);
          const Icone = destino.icone;

          return (
            <li key={destino.href} className="flex-1">
              <Link
                href={destino.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1 text-[10px] font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset focus-visible:outline-none",
                  ativo ? "text-brand" : "text-ink-muted",
                )}
              >
                {ativo && (
                  <motion.span
                    layoutId="nav-ativo"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icone className="size-5" aria-hidden="true" />
                <span className="max-w-full truncate">{destino.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-safe-bottom" />
    </nav>
  );
}
