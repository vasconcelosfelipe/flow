import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { requireSessao } from "@/lib/sessao";

/**
 * O Console é exclusivo do super-admin (adminPlataforma = true).
 * Qualquer outro usuário recebe 404 — não um aviso de "sem permissão",
 * que confirmaria que a rota existe.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const sessao = await requireSessao();
  if (!sessao.usuario.adminPlataforma) notFound();
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
