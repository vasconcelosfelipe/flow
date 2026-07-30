"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUser } from "@/lib/auth-client";
import type { SessaoAtual } from "@/services/empresas/dto";

export function FormularioPerfil({ usuario }: { usuario: SessaoAtual["usuario"] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState(usuario.nome);
  const [salvo, setSalvo] = useState(false);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvo(false);
    startTransition(async () => {
      await updateUser({ name: nome });
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setSalvo(false);
            }}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={usuario.email} disabled className="h-11" />
        </div>

        {salvo && <p className="text-nano text-positive-text">Perfil atualizado.</p>}

        <Button type="submit" disabled={pending || nome.trim() === ""} className="h-11 w-full">
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </form>

      <Link
        href="/perfil/senha"
        className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <KeyRound className="size-4.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="flex-1 text-corpo font-medium text-ink">Mudar senha</span>
      </Link>
    </div>
  );
}
