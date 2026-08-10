"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, KeyRound, LogOut } from "lucide-react";

import { signOut } from "@/lib/auth-client";
import type { SessaoAtual } from "@/services/empresas/dto";

function iniciaisDe(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Avatar pequeno pro canto direito do cabeçalho de Ajustes — mesmo lugar
 * onde o menu do usuário sempre ficou, só que agora é um link direto pro
 * cartão de perfil logo abaixo, não um dropdown. */
export function AvatarConta({ usuario }: { usuario: SessaoAtual["usuario"] }) {
  return (
    <Link
      href="/perfil"
      aria-label="Meu perfil"
      className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-white shadow-card focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      {iniciaisDe(usuario.nome)}
    </Link>
  );
}

/** Cartão de perfil + a lista de conta (senha, sair) — o que o menu do
 * usuário guardava atrás de um dropdown no topo agora mora fixo em
 * Ajustes, sempre visível em vez de escondido atrás de um toque a mais. */
export function PainelConta({ usuario }: { usuario: SessaoAtual["usuario"] }) {
  const router = useRouter();

  async function sair() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-3">
      <Link
        href="/perfil"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-white">
          {iniciaisDe(usuario.nome)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{usuario.nome}</span>
          <span className="block truncate text-micro text-ink-muted">{usuario.email}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
      </Link>

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <Link
          href="/perfil/senha"
          className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
            <KeyRound className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex-1 text-corpo font-medium text-ink">Mudar senha</span>
          <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={sair}
          className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-negative-wash focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-negative-wash text-negative-text">
            <LogOut className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex-1 text-corpo font-medium text-negative-text">Sair</span>
        </button>
      </div>
    </div>
  );
}
