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

      <div className="md:pl-16">
        <AppHeader sessao={sessao} />

        {/* Sem largura nem respiro aqui: as telas sangram até a borda quando
            precisam (zona escura do Início, DRE anual) e usam `Container` para
            o conteúdo. `pb-nav-safe` reserva exatamente a altura da barra de
            navegação, incluindo a margem de segurança do aparelho — um valor
            fixo bastava no navegador comum, mas ficava curto instalado como
            PWA, onde essa margem passa a valer de verdade. */}
        <main className="pb-nav-safe md:pb-10">{children}</main>
      </div>

      <BottomNav />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
