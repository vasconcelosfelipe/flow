"use client";

import { useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { EmptyState } from "@/components/shared/empty-state";
import { DetalheMovimentacaoSheet } from "@/features/movimentacoes/detalhe-sheet";
import { LinhaPendencia } from "@/features/pendencias/linha-pendencia";
import type { GrupoContato } from "@/services/pendencias/dto";

/**
 * Agrupada por contato, não por dia: aqui a pergunta é "quem me deve" ou
 * "para quem eu devo", não "o que aconteceu hoje" — essa já é a resposta da
 * tela de Movimentações.
 */
export function ListaPendencias({ grupos }: { grupos: GrupoContato[] }) {
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const todosOsItens = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);

  if (grupos.length === 0) {
    return (
      <EmptyState
        icone={CircleCheck}
        titulo="Nada em aberto"
        descricao="Todos os títulos deste filtro já foram pagos ou recebidos."
        className="mt-4"
      />
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {grupos.map((grupo) => (
        <section key={grupo.chave}>
          <div className="mb-1.5 flex items-baseline justify-between px-1">
            <h2 className="text-micro font-medium text-ink-muted">{grupo.rotulo}</h2>
            <AmountText centavos={grupo.totalCentavos} tamanho="sm" tom="neutro" />
          </div>

          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {grupo.itens.map((mov) => (
              <LinhaPendencia key={mov.id} movimentacao={mov} aoAbrir={setAbertoId} />
            ))}
          </div>
        </section>
      ))}

      {abertoId && (
        <DetalheMovimentacaoSheet
          movimentacao={todosOsItens.find((m) => m.id === abertoId) ?? null}
          aoFechar={() => setAbertoId(null)}
        />
      )}
    </div>
  );
}
