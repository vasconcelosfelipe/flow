"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().trim().email("Digite um e-mail válido."),
  senha: z.string().min(1, "Digite sua senha."),
});

/**
 * Fase 1: não há sessão real para validar contra — o formulário sempre
 * "funciona" após um instante de carregamento, o bastante para a tela de
 * seleção de empresa (ou o próprio app, com uma empresa só) ser o próximo
 * passo natural.
 */
export default function LoginPage() {
  const router = useRouter();
  const [entrando, setEntrando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  function enviar() {
    setEntrando(true);
    setTimeout(() => router.push("/selecionar-empresa"), 500);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-night">
      <h1 className="text-titulo font-semibold text-ink">Entrar</h1>
      <p className="mt-1 text-micro text-ink-muted">Acesse sua conta para continuar.</p>

      <form onSubmit={handleSubmit(enviar)} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            placeholder="voce@empresa.com.br"
            className="h-11"
          />
          {errors.email && <p className="text-nano text-negative-text">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            {...register("senha")}
            placeholder="••••••••"
            className="h-11"
          />
          {errors.senha && <p className="text-nano text-negative-text">{errors.senha.message}</p>}
        </div>

        <Button type="submit" className="h-11 w-full" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
