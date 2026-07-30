import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { SplashScreen } from "@/components/layout/splash-screen";

/**
 * A única tela do produto sem uma empresa por trás — por isso pode ser a
 * zona de comando pura, sem o claro do conteúdo que vem depois dela. Mesma
 * atmosfera do topo do Início (glow da marca + malha), aqui como cenário
 * inteiro em vez de cabeçalho.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="textura-noite min-h-app-safe flex flex-col items-center justify-center bg-night px-4 py-10 pb-safe">
      <SplashScreen />
      <div className="mb-10">
        <Logo tema="escuro" disposicao="empilhada" />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
