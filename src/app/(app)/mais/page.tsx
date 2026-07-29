import Link from "next/link";
import { ChevronRight, ShieldCheck, Tags, Users, Wallet } from "lucide-react";

import { Container } from "@/components/layout/container";
import { SESSAO_MOCK } from "@/lib/mock/sessao";

const ITENS_CADASTRO = [
  { href: "/contas", rotulo: "Contas", icone: Wallet },
  { href: "/contatos", rotulo: "Contatos", icone: Users },
  { href: "/centros-custo", rotulo: "Centros de custo", icone: Tags },
];

/**
 * Ponto de entrada para os cadastros que não cabem nos cinco slots fixos da
 * navegação. O Console só aparece para quem administra a plataforma — é uma
 * camada acima da empresa, não um cadastro dela.
 */
export default function MaisPage() {
  const sessao = SESSAO_MOCK;

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Mais</h1>

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {ITENS_CADASTRO.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
              <item.icone className="size-4.5" aria-hidden="true" />
            </span>
            <span className="flex-1 text-corpo font-medium text-ink">{item.rotulo}</span>
            <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
          </Link>
        ))}
      </div>

      {sessao.usuario.adminPlataforma && (
        <Link
          href="/console/empresas"
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-night text-night-text">
            <ShieldCheck className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-corpo font-medium text-ink">Console da plataforma</span>
            <span className="block text-nano text-ink-muted">Empresas e usuários</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
        </Link>
      )}
    </Container>
  );
}
