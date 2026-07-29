import Link from "next/link";
import { AlertTriangle, ChevronRight, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Alerta, SeveridadeAlerta } from "@/services/dashboard/dto";

const APARENCIA: Record<
  SeveridadeAlerta,
  { icone: typeof Info; chip: string; borda: string }
> = {
  critico: {
    icone: TriangleAlert,
    chip: "bg-negative-wash text-negative-text",
    borda: "border-negative/30",
  },
  atencao: {
    icone: AlertTriangle,
    chip: "bg-attention-wash text-attention-text",
    borda: "border-attention/30",
  },
  informativo: {
    icone: Info,
    chip: "bg-brand-wash text-brand",
    borda: "border-line",
  },
};

/**
 * Alertas só existem se levarem a uma ação. Cada um nomeia o que aconteceu e
 * abre exatamente a tela que resolve — avisar sem oferecer o caminho apenas
 * transfere trabalho para quem lê. Sem título de seção: o card de alerta já
 * se anuncia sozinho pelo ícone e pela cor, um rótulo acima seria redundante.
 */
export function ListaAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null;

  return (
    <section>
      <ul className="space-y-2">
        {alertas.map((alerta) => {
          const { icone: Icone, chip, borda } = APARENCIA[alerta.severidade];

          return (
            <li key={alerta.id}>
              <Link
                href={alerta.acao.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border bg-surface p-4 shadow-card transition-shadow",
                  "hover:shadow-raised focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
                  borda,
                )}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", chip)}>
                  <Icone className="size-4.5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{alerta.titulo}</span>
                  <span className="block text-[11px] text-ink-muted">{alerta.descricao}</span>
                </span>

                <span className="flex shrink-0 items-center gap-1 text-micro font-medium text-brand">
                  <span className="hidden sm:inline">{alerta.acao.rotulo}</span>
                  <ChevronRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
