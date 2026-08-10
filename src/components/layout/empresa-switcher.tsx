"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Building2, Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selecionarEmpresa } from "@/services/empresas/actions";
import type { EmpresaResumo } from "@/services/empresas/dto";
import { ROTULO_PAPEL } from "@/types/dominio";

export type EmpresaSwitcherProps = {
  empresas: EmpresaResumo[];
  ativa: EmpresaResumo;
};

/**
 * Cartão de "espaço ativo" em Ajustes — trocar de empresa é uma mudança de
 * contexto inteira (saldo, DRE, cada lançamento), por isso nunca é uma ação
 * escondida dentro de um menu de opções comuns, sempre o próprio cartão.
 *
 * Com uma empresa só, o botão "Trocar" nem aparece — não há troca a
 * oferecer, e um menu que abre com uma opção só é ruído.
 */
export function EmpresaSwitcher({ empresas, ativa }: EmpresaSwitcherProps) {
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

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-nano font-semibold tracking-wide text-ink-muted uppercase">
            Espaço ativo
          </span>
          <span className="block truncate font-medium text-ink">{ativa.nome}</span>
        </span>

        {!unica && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 rounded-full bg-brand-wash px-3 py-1.5 text-nano font-semibold text-brand transition-colors hover:bg-brand-wash/70 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              Trocar
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {overlay}
    </>
  );
}
