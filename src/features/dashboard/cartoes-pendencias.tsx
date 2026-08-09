import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { cn } from "@/lib/utils";
import type { BlocoPendencias } from "@/services/dashboard/dto";

/**
 * A pagar e a receber, lado a lado.
 *
 * O card é branco — a cor mora só no chip do ícone, que basta para dizer o que
 * é saída e o que é entrada sem tingir o cartão inteiro. São os dois blocos
 * que mais levam a uma ação, então o card inteiro é o alvo de toque e já abre
 * a lista filtrada.
 */
export function CartoesPendencias({
  aPagar,
  aReceber,
}: {
  aPagar: BlocoPendencias;
  aReceber: BlocoPendencias;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <CartaoPendencia
        rotulo="A pagar"
        bloco={aPagar}
        tom="saida"
        href="/movimentacoes?status=PENDENTE&tipo=DESPESA"
      />
      <CartaoPendencia
        rotulo="A receber"
        bloco={aReceber}
        tom="entrada"
        href="/movimentacoes?status=PENDENTE&tipo=RECEITA"
      />
    </div>
  );
}

function CartaoPendencia({
  rotulo,
  bloco,
  tom,
  href,
}: {
  rotulo: string;
  bloco: BlocoPendencias;
  tom: "entrada" | "saida";
  href: string;
}) {
  const saida = tom === "saida";
  const Icone = saida ? ArrowUpRight : ArrowDownLeft;
  const temVencido = saida && bloco.vencidoQuantidade > 0;

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow",
        "hover:shadow-raised focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        saida ? "focus-visible:ring-negative" : "focus-visible:ring-positive",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-nano font-semibold tracking-[0.14em] text-ink-muted uppercase">
          {rotulo}
        </p>
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg text-white",
            saida ? "bg-negative" : "bg-positive",
          )}
        >
          <Icone className="size-4" aria-hidden="true" />
        </span>
      </div>

      <AmountText
        centavos={bloco.totalCentavos}
        tom={saida ? "negativo" : "positivo"}
        tamanho="lg"
        className="mt-3 block"
      />

      <p className="mt-1 text-nano text-ink-muted">
        {bloco.quantidade} {bloco.quantidade === 1 ? "título" : "títulos"}
        {temVencido && (
          <span className="font-semibold text-negative-text">
            {" "}
            · {bloco.vencidoQuantidade} {bloco.vencidoQuantidade === 1 ? "vencido" : "vencidos"}
          </span>
        )}
      </p>
    </Link>
  );
}
