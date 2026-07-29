"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatarMesAno } from "@/lib/dates";

type Modo = "mensal" | "anual";

/**
 * Alterna a visão e navega mês a mês ou ano a ano — tudo na URL, para o
 * mesmo recorte sobreviver a um recarregamento ou a um link compartilhado.
 */
export function FiltrosDre({ modo, mes, ano }: { modo: Modo; mes: Date; ano: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, iniciarTransicao] = useTransition();

  function aplicar(mudancas: Record<string, string | null>) {
    const proximos = new URLSearchParams(params.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null) proximos.delete(chave);
      else proximos.set(chave, valor);
    }
    iniciarTransicao(() => {
      router.replace(`${pathname}?${proximos.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Tabs value={modo} onValueChange={(v) => aplicar({ modo: v })}>
        <TabsList className="h-9">
          <TabsTrigger value="mensal">Mês</TabsTrigger>
          <TabsTrigger value="anual">Ano</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-lg"
          aria-label={modo === "mensal" ? "Mês anterior" : "Ano anterior"}
          onClick={() =>
            modo === "mensal"
              ? aplicar({ mes: format(subMonths(mes, 1), "yyyy-MM") })
              : aplicar({ ano: String(ano - 1) })
          }
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-24 text-center text-micro font-medium text-ink">
          {modo === "mensal" ? formatarMesAno(mes) : ano}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-lg"
          aria-label={modo === "mensal" ? "Próximo mês" : "Próximo ano"}
          onClick={() =>
            modo === "mensal"
              ? aplicar({ mes: format(addMonths(mes, 1), "yyyy-MM") })
              : aplicar({ ano: String(ano + 1) })
          }
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
