import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import type { Centavos } from "@/lib/money";
import { cn } from "@/lib/utils";

type Tom = "neutro" | "positivo" | "negativo" | "atencao";

const ICONE_CLARO: Record<Tom, string> = {
  neutro: "bg-brand-wash text-brand",
  positivo: "bg-positive-wash text-positive-text",
  negativo: "bg-negative-wash text-negative-text",
  atencao: "bg-attention-wash text-attention-text",
};

const ICONE_ESCURO: Record<Tom, string> = {
  neutro: "bg-white/12 text-night-text",
  positivo: "bg-positive/25 text-white",
  negativo: "bg-negative/30 text-white",
  atencao: "bg-attention/30 text-white",
};

export type StatCardProps = {
  rotulo: string;
  centavos: Centavos;
  icone: LucideIcon;
  tom?: Tom;
  /** Linha de apoio: "5 títulos", "em 3 contas". */
  detalhe?: string;
  /**
   * Torna o card inteiro tocável. Um KPI que não leva a lugar nenhum obriga a
   * pessoa a reencontrar o mesmo dado pelo menu — o card já sabe o filtro.
   */
  href?: string;
  /** `escuro` para uso dentro da zona de comando. */
  tema?: "claro" | "escuro";
  className?: string;
};

export function StatCard({
  rotulo,
  centavos,
  icone: Icone,
  tom = "neutro",
  detalhe,
  href,
  tema = "claro",
  className,
}: StatCardProps) {
  const escuro = tema === "escuro";

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            escuro ? ICONE_ESCURO[tom] : ICONE_CLARO[tom],
          )}
        >
          <Icone className="size-4.5" aria-hidden="true" />
        </span>
        {href && (
          <ChevronRight
            className={cn(
              "size-4 transition-transform group-hover:translate-x-0.5",
              escuro ? "text-white/40" : "text-ink-muted/50",
            )}
            aria-hidden="true"
          />
        )}
      </div>

      <p
        className={cn(
          "mt-3 text-nano font-medium tracking-wide uppercase",
          escuro ? "text-white/55" : "text-ink-muted",
        )}
      >
        {rotulo}
      </p>
      <AmountText
        centavos={centavos}
        tom={escuro ? "invertido" : "neutro"}
        tamanho="lg"
        className="mt-1 block"
      />
      {detalhe && (
        <p className={cn("mt-1 text-nano", escuro ? "text-white/50" : "text-ink-muted")}>
          {detalhe}
        </p>
      )}
    </>
  );

  const estilo = cn(
    "block rounded-2xl p-4",
    escuro
      ? "border border-white/10 bg-white/8 backdrop-blur-sm"
      : "border border-line bg-surface shadow-card",
    href && "group transition-shadow focus-visible:ring-2 focus-visible:outline-none",
    href && (escuro ? "focus-visible:ring-white/70" : "hover:shadow-raised focus-visible:ring-brand focus-visible:ring-offset-2"),
    href && escuro && "transition-colors hover:bg-white/12",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={estilo}>
        {conteudo}
      </Link>
    );
  }

  return <div className={estilo}>{conteudo}</div>;
}
