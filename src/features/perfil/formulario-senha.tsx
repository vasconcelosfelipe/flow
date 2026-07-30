"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth-client";

export function FormularioSenha() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (nova.length < 8) {
      setErro("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (nova !== confirmacao) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }

    startTransition(async () => {
      const { error } = await changePassword({
        currentPassword: atual,
        newPassword: nova,
        revokeOtherSessions: true,
      });
      if (error) {
        setErro("Senha atual incorreta.");
        return;
      }
      router.push("/perfil");
    });
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="senha-atual">Senha atual</Label>
        <Input
          id="senha-atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          required
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha-nova">Nova senha</Label>
        <Input
          id="senha-nova"
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          required
          minLength={8}
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha-confirmacao">Confirmar nova senha</Label>
        <Input
          id="senha-confirmacao"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
          minLength={8}
          className="h-11"
        />
      </div>

      {erro && <p className="text-nano text-negative-text">{erro}</p>}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
