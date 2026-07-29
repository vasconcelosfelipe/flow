import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Rótulo de seção, com variante para cada atmosfera do produto.
 *
 * Miúdo, em caixa alta e com espacejamento largo: ele precisa organizar sem
 * competir com os números, que são o conteúdo. A mesma regra estrutural vale
 * nas duas atmosferas — só a cor muda.
 */
export function SectionTitle({
  children,
  acao,
  tema = "claro",
  className,
}: {
  children: React.ReactNode;
  acao?: { rotulo: string; href: string };
  /** `escuro` quando a seção vive sobre a zona de marca. */
  tema?: "claro" | "escuro";
  className?: string;
}) {
  const escuro = tema === "escuro";

  return (
    <div className={cn("mb-2.5 flex items-center justify-between gap-3", className)}>
      <h2
        className={cn(
          "text-nano font-semibold tracking-[0.14em] uppercase",
          escuro ? "text-night-muted" : "text-ink-muted",
        )}
      >
        {children}
      </h2>
      {acao && (
        <Link
          href={acao.href}
          className={cn(
            "flex items-center gap-1 rounded-lg px-1 py-0.5 text-micro font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none",
            escuro
              ? "text-white focus-visible:ring-white/70"
              : "text-brand focus-visible:ring-brand",
          )}
        >
          {acao.rotulo}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
