"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ABAS = [
  { valor: "todos", rotulo: "Tudo" },
  { valor: "DESPESA", rotulo: "A pagar" },
  { valor: "RECEITA", rotulo: "A receber" },
] as const;

/**
 * Só o tipo mora aqui — `situacao=vencidas` é um atalho de entrada vindo dos
 * alertas do dashboard, não um controle que a pessoa alterna nesta tela.
 */
export function FiltrosPendencias() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, iniciarTransicao] = useTransition();

  const tipoAtivo = params.get("tipo") ?? "todos";

  function selecionar(valor: string) {
    const proximos = new URLSearchParams(params.toString());
    if (valor === "todos") proximos.delete("tipo");
    else proximos.set("tipo", valor);

    iniciarTransicao(() => {
      router.replace(`${pathname}?${proximos.toString()}`, { scroll: false });
    });
  }

  return (
    <Tabs value={tipoAtivo} onValueChange={selecionar}>
      <TabsList className="h-10 w-full">
        {ABAS.map((aba) => (
          <TabsTrigger key={aba.valor} value={aba.valor} className="flex-1">
            {aba.rotulo}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
