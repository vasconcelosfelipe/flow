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
        <main className="flex-1 pb-6 md:pb-10">{children}</main>
        <BottomNav />
      </div>

      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
