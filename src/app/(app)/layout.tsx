import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopRail } from "@/components/layout/desktop-rail";
import { NovoLancamentoProvider } from "@/components/layout/novo-lancamento-provider";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { requireSessao } from "@/lib/sessao";
import { listarCategorias } from "@/services/categorias";
import { listarContas } from "@/services/contas";
import { listarContatos } from "@/services/contatos";
import { listarLinhasDre } from "@/services/linhas-dre";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sessao = await requireSessao();

  // Admin sem empresa: manda direto para o console
  if (!sessao.empresaAtiva) redirect("/console/empresas");

  const empresaId = sessao.empresaAtiva.id;
  const somenteLeitura = sessao.empresaAtiva.papel === "LEITOR";

  // O modal de novo lançamento mora aqui (não em cada página) pra o "+" da
  // navegação abri-lo de qualquer tela — por isso estas 4 buscas rodam em
  // todo carregamento do app, não só em Movimentações. Listas pequenas
  // nesse produto, custo aceitável pela simplicidade de um modal só.
  const [contas, categorias, contatos, linhas] = await Promise.all([
    listarContas(empresaId),
    listarCategorias(empresaId),
    listarContatos(empresaId),
    listarLinhasDre(),
  ]);

  return (
    <TooltipProvider delayDuration={300}>
      <NovoLancamentoProvider
        contas={contas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }))}
        categorias={categorias}
        contatos={contatos}
        linhas={linhas}
        tipoEspaco={sessao.empresaAtiva.tipo}
        somenteLeitura={somenteLeitura}
      >
        <DesktopRail tipoEspaco={sessao.empresaAtiva.tipo} somenteLeitura={somenteLeitura} />

        <div className="flex min-h-app-safe flex-col md:pl-16">
          <AppHeader sessao={sessao} />
          {/* A barra inferior é `fixed` (não faz parte do fluxo), então o
              conteúdo precisa reservar o próprio espaço embaixo — senão o
              último card fica escondido atrás dela. */}
          <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] md:pb-10">
            {/* Puxar-para-atualizar só neste miolo — a barra superior e a
                inferior nunca se movem com o gesto, só o conteúdo entre elas. */}
            <PullToRefresh>{children}</PullToRefresh>
          </main>
        </div>

        <BottomNav tipoEspaco={sessao.empresaAtiva.tipo} somenteLeitura={somenteLeitura} />
        <Toaster position="top-center" />
      </NovoLancamentoProvider>
    </TooltipProvider>
  );
}
