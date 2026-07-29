import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Container } from "@/components/layout/container";

/**
 * O Console é uma camada acima de qualquer empresa — por isso não herda o
 * cromo do app (sem seletor de empresa, sem as cinco abas de navegação
 * financeira). O cabeçalho deixa isso explícito: "voltar" leva para dentro
 * de uma empresa, não para uma aba irmã dentro do Console.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="pt-safe sticky top-0 z-50 bg-night text-night-text">
        <Container className="flex h-14 items-center gap-3">
          <Link
            href="/"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-night-muted transition-colors hover:bg-white/10 hover:text-night-text focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
            <span className="sr-only">Voltar para o app</span>
          </Link>
          <ShieldCheck className="size-4 shrink-0 text-night-muted" aria-hidden="true" />
          <span className="text-micro font-semibold tracking-wide uppercase">
            Console da plataforma
          </span>
        </Container>
      </header>

      <nav className="border-b border-line bg-surface">
        <Container className="flex gap-1 py-2">
          <Link
            href="/console/empresas"
            className="rounded-lg px-3 py-1.5 text-micro font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink"
          >
            Empresas
          </Link>
          <Link
            href="/console/usuarios"
            className="rounded-lg px-3 py-1.5 text-micro font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink"
          >
            Usuários
          </Link>
        </Container>
      </nav>

      <main className="pb-10">{children}</main>
    </div>
  );
}
