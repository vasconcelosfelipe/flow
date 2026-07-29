import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { TransactionRow } from "@/components/shared/transaction-row";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

/**
 * O título mora dentro do card, não solto sobre a página.
 *
 * Quando este bloco vive numa zona escura, um rótulo fora do card fica cor
 * clara sobre azul bem no ponto onde a curva de transição termina — pouco
 * contraste, pouco espaço, difícil de ler. Dentro do card ele é sempre texto
 * escuro sobre branco, não importa o fundo da página: uma variante a menos
 * para manter e sempre legível.
 */
export function UltimasMovimentacoes({
  movimentacoes,
}: {
  movimentacoes: MovimentacaoResumo[];
}) {
  if (movimentacoes.length === 0) {
    return (
      <EmptyState
        icone={Receipt}
        titulo="Nenhuma movimentação no período"
        descricao="Importe o extrato do banco em OFX para começar a acompanhar o resultado."
        acao={{ rotulo: "Importar extrato", href: "/importar" }}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <h2 className="text-nano font-semibold tracking-[0.14em] text-ink-muted uppercase">
          Últimas movimentações
        </h2>
        <Link
          href="/movimentacoes"
          className="flex items-center gap-1 rounded-lg px-1 py-0.5 text-micro font-medium text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          Ver todas
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="divide-y divide-line">
        {movimentacoes.map((movimentacao) => (
          <TransactionRow key={movimentacao.id} movimentacao={movimentacao} />
        ))}
      </div>
    </section>
  );
}
