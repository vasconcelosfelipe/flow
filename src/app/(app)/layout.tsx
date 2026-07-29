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

      <div className="md:pl-16 h-dvh overflow-y-auto overscroll-contain md:h-auto md:overflow-visible">
        <AppHeader sessao={sessao} />
        <main className="pb-nav-safe md:pb-10">{children}</main>
      </div>

      <BottomNav />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
