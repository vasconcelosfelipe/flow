"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { selecionarEmpresa } from "@/services/empresas/actions";
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
  const [, startTransition] = useTransition();
  const unica = empresas.length <= 1;

  // Cobre a tela inteira, revela o nome do espaço novo, some — a sensação de
  // fechar um espaço e abrir outro, não só um rótulo trocando no canto.
  const [transicaoPara, setTransicaoPara] = useState<string | null>(null);
  const semAnimacao = useReducedMotion();

  useEffect(() => {
    if (!transicaoPara) return;
    const t = setTimeout(() => setTransicaoPara(null), semAnimacao ? 300 : 1300);
    return () => clearTimeout(t);
  }, [transicaoPara, semAnimacao]);

  function trocarPara(slug: string, nome: string) {
    setTransicaoPara(nome);
    startTransition(async () => {
      await selecionarEmpresa(slug);
      // `push` já busca a Home do zero no servidor — um `refresh()` depois
      // dele repetia a mesma busca de novo, dobrando a espera à toa.
      router.push("/");
    });
  }

  const overlay = (
    <AnimatePresence>
      {transicaoPara && (
        <motion.div
          className="textura-noite fixed inset-0 z-[100] flex flex-col items-center justify-center bg-night"
          initial={semAnimacao ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: semAnimacao ? 0 : 0.3, ease: "easeInOut" }}
        >
          <motion.div
            initial={semAnimacao ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: semAnimacao ? 0 : 0.4,
              delay: semAnimacao ? 0 : 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Building2 className="size-12 text-night-text" aria-hidden="true" />
          </motion.div>
          <motion.span
            initial={semAnimacao ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: semAnimacao ? 0 : 0.4, delay: semAnimacao ? 0 : 0.35, ease: "easeOut" }}
            className="mt-3 max-w-[80vw] truncate text-titulo font-semibold text-night-text"
          >
            {transicaoPara}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (unica && !mostrarConsole) {
    return (
      <>
        <span className="flex min-w-0 items-center gap-1.5 text-micro font-medium text-night-text">
          <Building2 className="size-3.5 shrink-0 text-night-muted" aria-hidden="true" />
          <span className="truncate">{ativa.nome}</span>
        </span>
        {overlay}
      </>
    );
  }

  return (
    <>
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
          <span className="sr-only">Trocar de espaço</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[11px] text-ink-muted">
            Seus espaços
          </DropdownMenuLabel>

          {empresas.map((empresa) => {
            const selecionada = empresa.id === ativa.id;
            return (
              <DropdownMenuItem
                key={empresa.id}
                onSelect={() => trocarPara(empresa.slug, empresa.nome)}
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
      {overlay}
    </>
  );
}
