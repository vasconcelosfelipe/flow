"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePeriodParams } from "@/hooks/use-period-params";
import { PRESETS_PERIODO, ROTULO_PRESET, formatarData } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Controle segmentado com os cinco recortes que cobrem o uso diário, mais um
 * intervalo livre atrás de um toque.
 *
 * Os presets ficam sempre visíveis porque trocar de período é a interação mais
 * repetida do produto — escondê-la atrás de um menu custaria dois toques em
 * cada consulta.
 */
export function PeriodPicker({
  className,
  tema = "claro",
}: {
  className?: string;
  /** `escuro` para uso dentro da zona de comando do Início. */
  tema?: "claro" | "escuro";
}) {
  const { selecao, periodo, definirPreset, definirPersonalizado, navegarMes } = usePeriodParams();
  const [modalAberto, setModalAberto] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  function fechar() {
    setDe("");
    setAte("");
    setModalAberto(false);
  }

  const personalizado = selecao.modo === "personalizado";
  const escuro = tema === "escuro";

  const estiloSeta = cn(
    "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
    "focus-visible:ring-2 focus-visible:outline-none",
    escuro
      ? "text-night-muted hover:bg-white/10 hover:text-night-text focus-visible:ring-white/70"
      : "text-ink-muted hover:bg-muted focus-visible:ring-brand",
  );

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <button
          type="button"
          onClick={() => navegarMes(-1)}
          aria-label="Mês anterior"
          className={estiloSeta}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        <div
          className={cn(
            "scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl p-1",
            escuro ? "bg-white/10" : "bg-muted",
          )}
          role="group"
          aria-label="Período"
        >
          {PRESETS_PERIODO.map((preset) => {
            const ativo = !personalizado && selecao.preset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => definirPreset(preset)}
                aria-pressed={ativo}
                className={cn(
                  "relative shrink-0 rounded-lg px-3 py-1.5 text-micro font-medium whitespace-nowrap transition-colors",
                  "focus-visible:ring-2 focus-visible:outline-none",
                  escuro
                    ? ativo
                      ? "text-night focus-visible:ring-white/70"
                      : "text-night-muted hover:text-night-text focus-visible:ring-white/70"
                    : ativo
                      ? "text-ink focus-visible:ring-brand"
                      : "text-ink-muted hover:text-ink focus-visible:ring-brand",
                )}
              >
                {ativo && (
                  <motion.span
                    layoutId="periodo-ativo"
                    className={cn(
                      "absolute inset-0 rounded-lg",
                      escuro ? "bg-white" : "bg-surface shadow-card",
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{ROTULO_PRESET[preset]}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setModalAberto(true)}
            aria-pressed={personalizado}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-micro font-medium whitespace-nowrap transition-colors",
              "focus-visible:ring-2 focus-visible:outline-none",
              escuro
                ? personalizado
                  ? "bg-white text-night focus-visible:ring-white/70"
                  : "text-night-muted hover:text-night-text focus-visible:ring-white/70"
                : personalizado
                  ? "bg-surface text-ink shadow-card focus-visible:ring-brand"
                  : "text-ink-muted hover:text-ink focus-visible:ring-brand",
            )}
          >
            <CalendarRange className="size-3.5" aria-hidden="true" />
            {personalizado
              ? `${formatarData(periodo.de)} – ${formatarData(periodo.ate)}`
              : "Escolher"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => navegarMes(1)}
          aria-label="Próximo mês"
          className={estiloSeta}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

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
    </>
  );
}
