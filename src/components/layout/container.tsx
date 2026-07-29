import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Largura de leitura do app.
 *
 * Fica no componente e não no layout porque as telas precisam sangrar até a
 * borda (a zona escura do Início, a DRE anual) e ainda assim manter o texto
 * alinhado com o resto do produto.
 */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1180px] px-4", className)}>{children}</div>
  );
}
