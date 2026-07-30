import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopRail } from "@/components/layout/desktop-rail";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { requireSessao } from "@/lib/sessao";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sessao = await requireSessao();

  // Admin sem empresa: manda direto para o console
  if (!sessao.empresaAtiva) redirect("/console/empresas");

  return (
    <TooltipProvider delayDuration={300}>
      <DesktopRail />

      <div className="flex min-h-dvh flex-col md:pl-16">
        <AppHeader sessao={sessao} />
        {/* A barra inferior é `fixed` (não faz parte do fluxo), então o
            conteúdo precisa reservar o próprio espaço embaixo — senão o
            último card fica escondido atrás dela. */}
        <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] md:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
