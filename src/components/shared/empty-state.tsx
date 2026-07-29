import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icone: LucideIcon;
  titulo: string;
  /** Diz o que fazer, não que está vazio. A tela vazia já diz isso sozinha. */
  descricao: string;
  acao?: { rotulo: string; href: string };
  className?: string;
};

/**
 * Tela sem conteúdo é um convite para agir, não um aviso de ausência. Por isso
 * todo estado vazio aqui carrega uma ação — a pessoa nunca fica olhando para
 * um espaço em branco sem saber qual é o próximo passo.
 */
export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-wash text-brand">
        <Icone className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-medium text-ink">{titulo}</h3>
      <p className="mt-1 max-w-xs text-micro text-ink-muted">{descricao}</p>
      {acao && (
        <Button asChild className="mt-5">
          <Link href={acao.href}>{acao.rotulo}</Link>
        </Button>
      )}
    </div>
  );
}
