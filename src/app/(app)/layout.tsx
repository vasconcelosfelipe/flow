import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopRail } from "@/components/layout/desktop-rail";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SESSAO_MOCK } from "@/lib/mock/sessao";

/**
 * Casca do app financeiro.
 *
 * A sessão é resolvida no servidor e desce por props: nenhum provider de
 * contexto no cliente para algo que não muda durante a navegação. Na Fase 2,
 * `SESSAO_MOCK` vira `await requireEmpresa()` e mais nada muda aqui.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const sessao = SESSAO_MOCK;

  return (
    <TooltipProvider delayDuration={300}>
      <DesktopRail />

      {/* Container de scroll único no mobile: html/body têm overflow:hidden,
          então todo scroll acontece aqui. O sticky header funciona dentro deste
          container. O BottomNav (fixed) ancora no viewport independente. */}
      <div className="md:pl-16 h-dvh overflow-y-auto overscroll-contain md:h-auto md:overflow-visible">
        <AppHeader sessao={sessao} />
        <main className="pb-nav-safe md:pb-10">{children}</main>
      </div>

      <BottomNav />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
