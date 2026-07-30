"use client";

import { LogOut, KeyRound, UserCircle2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import type { SessaoAtual } from "@/services/empresas/dto";

export function UserMenu({ usuario }: { usuario: SessaoAtual["usuario"] }) {
  const router = useRouter();

  const iniciais = usuario.nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  async function sair() {
    await signOut();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold text-night-muted ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-night-text focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          aria-label="Menu do usuário"
        >
          {iniciais}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-semibold text-ink">{usuario.nome}</p>
          <p className="truncate text-xs text-ink-muted">{usuario.email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => router.push("/perfil")}>
          <UserCircle2 className="mr-2 size-4" />
          Meu perfil
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => router.push("/perfil/senha")}>
          <KeyRound className="mr-2 size-4" />
          Mudar senha
        </DropdownMenuItem>

        {usuario.adminPlataforma && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/console/empresas")}>
              <ShieldCheck className="mr-2 size-4" />
              Console admin
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={sair}
          className="text-negative-text focus:text-negative-text"
        >
          <LogOut className="mr-2 size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
