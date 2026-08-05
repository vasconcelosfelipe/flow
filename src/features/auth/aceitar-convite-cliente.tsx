"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aceitarConvite } from "@/services/convites/actions";
import { ROTULO_PAPEL } from "@/types/dominio";
import type { ConviteValido } from "@/services/convites/dto";

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(60),
  senha: z.string().min(8, "Mínimo de 8 caracteres."),
});

export function AceitarConviteCliente({
  token,
  convite,
}: {
  token: string;
  convite: ConviteValido;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  function enviar(dados: z.infer<typeof schema>) {
    setErro(null);
    startTransition(async () => {
      try {
        await aceitarConvite(token, dados.nome, dados.senha);
        router.push("/login?convidado=1");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra aceitar o convite.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-night">
      <h1 className="text-titulo font-semibold text-ink">Você foi convidado</h1>
      <p className="mt-1 text-micro text-ink-muted">
        Pra <strong className="text-ink">{convite.empresaNome}</strong>, como{" "}
        <strong className="text-ink">{ROTULO_PAPEL[convite.papel]}</strong>. Crie sua senha pra
        começar.
      </p>

      <form onSubmit={handleSubmit(enviar)} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={convite.email} disabled className="h-11" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nome">Seu nome</Label>
          <Input
            id="nome"
            autoComplete="name"
            autoFocus
            {...register("nome")}
            placeholder="Ex.: Camila Rocha"
            className="h-11"
          />
          {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="senha">Crie uma senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="new-password"
            {...register("senha")}
            placeholder="••••••••"
            className="h-11"
          />
          {errors.senha && <p className="text-nano text-negative-text">{errors.senha.message}</p>}
        </div>

        {erro && (
          <p className="rounded-lg bg-negative/10 px-3 py-2 text-nano text-negative-text">{erro}</p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Criando conta…" : "Aceitar e criar conta"}
        </Button>
      </form>
    </div>
  );
}
