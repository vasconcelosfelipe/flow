"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { format } from "date-fns";

import {
  PRESETS_PERIODO,
  resolverPeriodo,
  type Periodo,
  type PresetPeriodo,
} from "@/lib/dates";

export type SelecaoPeriodo =
  | { modo: "preset"; preset: PresetPeriodo }
  | { modo: "personalizado" };

/**
 * O período vive na URL, nunca em estado local.
 *
 * Isso é o que permite o servidor renderizar a tela já filtrada, o botão
 * voltar funcionar, e um link compartilhado abrir exatamente o mesmo recorte
 * que a pessoa estava vendo.
 */
export function usePeriodParams(padrao: PresetPeriodo = "mes") {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pendente, iniciarTransicao] = useTransition();

  const de = params.get("de");
  const ate = params.get("ate");
  const presetBruto = params.get("periodo");

  const selecao: SelecaoPeriodo = useMemo(() => {
    if (de && ate) return { modo: "personalizado" };
    const valido = PRESETS_PERIODO.find((p) => p === presetBruto);
    return { modo: "preset", preset: valido ?? padrao };
  }, [de, ate, presetBruto, padrao]);

  const periodo: Periodo = useMemo(() => {
    if (de && ate) {
      return { de: startOfDay(parseISO(de)), ate: endOfDay(parseISO(ate)) };
    }
    return resolverPeriodo(
      selecao.modo === "preset" ? selecao.preset : padrao,
    );
  }, [de, ate, selecao, padrao]);

  const aplicar = useCallback(
    (mudancas: Record<string, string | null>) => {
      const proximos = new URLSearchParams(params.toString());
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor === null) proximos.delete(chave);
        else proximos.set(chave, valor);
      }
      iniciarTransicao(() => {
        router.replace(`${pathname}?${proximos.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const definirPreset = useCallback(
    (preset: PresetPeriodo) => {
      aplicar({ periodo: preset, de: null, ate: null });
    },
    [aplicar],
  );

  const definirPersonalizado = useCallback(
    (inicio: Date, fim: Date) => {
      aplicar({
        periodo: null,
        de: format(inicio, "yyyy-MM-dd"),
        ate: format(fim, "yyyy-MM-dd"),
      });
    },
    [aplicar],
  );

  return { selecao, periodo, definirPreset, definirPersonalizado, pendente };
}
