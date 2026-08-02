"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { motion } from "motion/react";

import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { usePeriodParams } from "@/hooks/use-period-params";
import { PRESETS_PERIODO, ROTULO_PRESET, formatarData } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

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
  const { selecao, periodo, definirPreset, definirPersonalizado } = usePeriodParams();
  const [modalAberto, setModalAberto] = useState(false);
  const [intervalo, setIntervalo] = useState<DateRange | undefined>();

  const personalizado = selecao.modo === "personalizado";
  const escuro = tema === "escuro";

  return (
    <>
      <div
        className={cn(
          "scrollbar-none flex items-center gap-1 overflow-x-auto rounded-xl p-1",
          escuro ? "bg-white/10" : "bg-muted",
          className,
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

      <ResponsiveModal
        aberto={modalAberto}
        aoMudarAberto={setModalAberto}
        titulo="Escolher período"
        descricao="Selecione a data inicial e a data final do intervalo."
        rodape={
          <>
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!intervalo?.from || !intervalo?.to}
              onClick={() => {
                if (!intervalo?.from || !intervalo?.to) return;
                definirPersonalizado(intervalo.from, intervalo.to);
                setModalAberto(false);
              }}
            >
              Aplicar período
            </Button>
          </>
        }
      >
        <div className="flex justify-center pb-2">
          <Calendar
            mode="range"
            selected={intervalo}
            onSelect={setIntervalo}
            numberOfMonths={1}
            autoFocus
          />
        </div>
      </ResponsiveModal>
    </>
  );
}
