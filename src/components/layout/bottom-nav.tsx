"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";

import { DESTINOS, destinoAtivo } from "@/components/layout/navegacao";
import { useNovoLancamento } from "@/components/layout/novo-lancamento-provider";
import { cn } from "@/lib/utils";
import type { TipoEmpresa } from "@/types/dominio";

/**
 * Barra inferior fixa — o polegar alcança tudo sem reposicionar a mão.
 *
 * O indicador é um único elemento que desliza entre destinos (`layoutId`), em
 * vez de aparecer e sumir: o movimento conta de onde a pessoa veio, o que
 * torna a navegação legível sem exigir leitura do rótulo.
 *
 * O "+" central não é um destino (não navega) — abre o modal global de novo
 * lançamento (`NovoLancamentoProvider`), de qualquer tela. Por isso vive
 * fora do `.map()` de `DESTINOS`, inserido na posição central por índice.
 */
export function BottomNav({
  tipoEspaco,
  somenteLeitura = false,
}: {
  tipoEspaco: TipoEmpresa;
  somenteLeitura?: boolean;
}) {
  const pathname = usePathname();
  // O kill-switch global de prefers-reduced-motion (globals.css) só zera
  // duração de transition/animation CSS — este indicador é motion/react
  // (spring via WAAPI), então precisa checar a preferência na mão.
  const semAnimacao = useReducedMotion();
  const { abrir } = useNovoLancamento();
  // Espaço pessoa física não tem DRE — o mesmo destino leva pro resumo de
  // despesas por categoria, então o rótulo muda junto, sem duplicar a
  // navegação numa lista separada por tipo de espaço.
  const destinos = DESTINOS.map((d) =>
    d.href === "/dre" && tipoEspaco === "PESSOA_FISICA" ? { ...d, rotulo: "Resumo" } : d,
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-night md:hidden"
      aria-label="Navegação principal"
    >
      <ul className="flex items-stretch justify-around px-1">
        {destinos.flatMap((destino, i) => {
          const ativo = destinoAtivo(pathname, destino);
          const Icone = destino.icone;

          const link = (
            <li key={destino.href} className="flex-1">
              <Link
                href={destino.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1 text-[10px] font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset focus-visible:outline-none",
                  ativo ? "text-night-text" : "text-night-muted",
                )}
              >
                {ativo && (
                  <motion.span
                    layoutId="nav-ativo"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-night-text"
                    transition={semAnimacao ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icone className="size-5" aria-hidden="true" />
                <span className="max-w-full truncate">{destino.rotulo}</span>
              </Link>
            </li>
          );

          if (i !== 2) return [link];
          return [
            // `relative` no `<li>` + botão `absolute` deixa o círculo maior
            // que a própria barra e furar pra cima dela — é o destaque
            // pedido: o olho acha o "+" antes de ler qualquer rótulo.
            <li key="novo-lancamento" className="relative flex-1">
              <button
                type="button"
                onClick={abrir}
                disabled={somenteLeitura}
                aria-label="Novo lançamento"
                className="absolute inset-x-0 -top-6 flex flex-col items-center rounded-full focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-40"
              >
                <span className="grid size-16 place-items-center rounded-full bg-brand text-white shadow-[0_12px_28px_-8px_rgba(37,99,235,0.65)] ring-4 ring-canvas">
                  <Plus className="size-7" aria-hidden="true" />
                </span>
              </button>
            </li>,
            link,
          ];
        })}
      </ul>
      <div className="h-safe-bottom" />
    </nav>
  );
}
