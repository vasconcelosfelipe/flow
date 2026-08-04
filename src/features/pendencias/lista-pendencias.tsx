"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { DetalheMovimentacaoSheet } from "@/features/movimentacoes/detalhe-sheet";
import { LinhaPendencia } from "@/features/pendencias/linha-pendencia";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

type OpcaoConta = { id: string; nome: string };

/**
 * Ordenada por vencimento, não agrupada por contato: aqui a pergunta é "o
 * que vence primeiro", a mesma lógica de agenda que o resto do produto usa
 * pra pendência — quem cobra ou é cobrado já aparece na própria linha.
 */
export function ListaPendencias({
  itens,
  contas = [],
  categorias = [],
  contatos = [],
  linhas = [],
}: {
  itens: MovimentacaoResumo[];
  contas?: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
}) {
  const [abertoId, setAbertoId] = useState<string | null>(null);

  if (itens.length === 0) {
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
    <div className="pb-20">
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {itens.map((mov) => (
          <LinhaPendencia key={mov.id} movimentacao={mov} aoAbrir={setAbertoId} />
        ))}
      </div>

      {abertoId && (
        <DetalheMovimentacaoSheet
          movimentacao={itens.find((m) => m.id === abertoId) ?? null}
          contas={contas}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
          aoFechar={() => setAbertoId(null)}
        />
      )}
    </div>
  );
}
