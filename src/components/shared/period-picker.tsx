"use client";

import { useState } from "react";
import { endOfMonth, endOfYear, format, isSameDay, parseISO, startOfMonth, startOfYear, subDays } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePeriodParams } from "@/hooks/use-period-params";
import { formatarData, formatarMesAno } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Modo = "mes" | "ano";

const ATALHOS_DIAS = [7, 30, 60, 90] as const;

/**
 * Mesma visualização da DRE — alterna mês/ano e navega com setas — mais um
 * atalho pra período personalizado (ícone de calendário, abre modal). Ao
 * aplicar um personalizado, o rótulo no topo passa a mostrar o intervalo
 * escolhido no lugar do mês/ano.
 */
export function PeriodPicker({
  className,
  tema = "claro",
}: {
  className?: string;
  /** `escuro` para uso dentro da zona de comando do Início. */
  tema?: "claro" | "escuro";
}) {
  const { periodo, definirPersonalizado, navegarMes, navegarAno } = usePeriodParams();
  const [modalAberto, setModalAberto] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  function fechar() {
    setDe("");
    setAte("");
    setModalAberto(false);
  }

  function preencherUltimosDias(quantidade: number) {
    const hoje = new Date();
    setDe(format(subDays(hoje, quantidade - 1), "yyyy-MM-dd"));
    setAte(format(hoje, "yyyy-MM-dd"));
  }

  const escuro = tema === "escuro";

  const ehMesCheio =
    isSameDay(periodo.de, startOfMonth(periodo.de)) && isSameDay(periodo.ate, endOfMonth(periodo.de));
  const ehAnoCheio =
    isSameDay(periodo.de, startOfYear(periodo.de)) && isSameDay(periodo.ate, endOfYear(periodo.de));
  // Fora dos dois formatos "cheios" só existe por escolha explícita no modal.
  const personalizado = !ehMesCheio && !ehAnoCheio;
  const modo: Modo | null = personalizado ? null : ehAnoCheio ? "ano" : "mes";

  function mudarModo(novoModo: Modo) {
    if (novoModo === modo) return;
    if (novoModo === "mes") definirPersonalizado(startOfMonth(periodo.de), endOfMonth(periodo.de));
    else definirPersonalizado(startOfYear(periodo.de), endOfYear(periodo.de));
  }

  const estiloSeta = cn(
    "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
    "focus-visible:ring-2 focus-visible:outline-none",
    escuro
      ? "text-night-muted hover:bg-white/10 hover:text-night-text focus-visible:ring-white/70"
      : "text-ink-muted hover:bg-muted focus-visible:ring-brand",
  );

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex items-center gap-1">
        <Tabs value={modo ?? undefined} onValueChange={(v) => mudarModo(v as Modo)}>
          <TabsList className="h-9">
            <TabsTrigger value="mes">Mês</TabsTrigger>
            <TabsTrigger value="ano">Ano</TabsTrigger>
          </TabsList>
        </Tabs>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          aria-label="Personalizar período"
          aria-pressed={personalizado}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
            "focus-visible:ring-2 focus-visible:outline-none",
            escuro
              ? personalizado
                ? "bg-white text-night focus-visible:ring-white/70"
                : "text-night-muted hover:bg-white/10 hover:text-night-text focus-visible:ring-white/70"
              : personalizado
                ? "bg-brand-wash text-brand focus-visible:ring-brand"
                : "text-ink-muted hover:bg-muted focus-visible:ring-brand",
          )}
        >
          <CalendarRange className="size-4" aria-hidden="true" />
        </button>
      </div>

      {personalizado ? (
        <span className={cn("text-micro font-medium", escuro ? "text-night-text" : "text-ink")}>
          {formatarData(periodo.de)} – {formatarData(periodo.ate)}
        </span>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => (modo === "ano" ? navegarAno(-1) : navegarMes(-1))}
            aria-label={modo === "ano" ? "Ano anterior" : "Mês anterior"}
            className={estiloSeta}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span
            className={cn(
              "min-w-24 text-center text-micro font-medium whitespace-nowrap",
              escuro ? "text-night-text" : "text-ink",
            )}
          >
            {modo === "ano" ? periodo.de.getFullYear() : formatarMesAno(periodo.de)}
          </span>
          <button
            type="button"
            onClick={() => (modo === "ano" ? navegarAno(1) : navegarMes(1))}
            aria-label={modo === "ano" ? "Próximo ano" : "Próximo mês"}
            className={estiloSeta}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <ResponsiveModal
        aberto={modalAberto}
        aoMudarAberto={(aberto) => !aberto && fechar()}
        titulo="Escolher período"
        descricao="Selecione a data inicial e a data final do intervalo."
        rodape={
          <>
            <Button variant="outline" size="lg" className="flex-1" onClick={fechar}>
              Cancelar
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!de || !ate}
              onClick={() => {
                if (!de || !ate) return;
                definirPersonalizado(parseISO(de), parseISO(ate));
                fechar();
              }}
            >
              Aplicar período
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            {ATALHOS_DIAS.map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => preencherUltimosDias(dias)}
                className="rounded-full border border-line px-3 py-1 text-nano font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand"
              >
                {dias} dias
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="periodo-de">De</Label>
            <Input
              id="periodo-de"
              type="date"
              className="h-11"
              value={de}
              max={ate || undefined}
              onChange={(e) => setDe(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="periodo-ate">Até</Label>
            <Input
              id="periodo-ate"
              type="date"
              className="h-11"
              value={ate}
              min={de || undefined}
              onChange={(e) => setAte(e.target.value)}
            />
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
