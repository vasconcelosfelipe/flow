"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { TransactionRow } from "@/components/shared/transaction-row";
import { DetalheMovimentacaoSheet } from "@/features/movimentacoes/detalhe-sheet";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

/** Lista de uma fatura, com o mesmo sheet de detalhe/edição das outras
 * telas — só que a conta chega travada num item só (esta conta), porque
 * `DetalheMovimentacaoSheet` já esconde Status/Conta quando é cartão. */
export function ListaFaturaCartao({
  itens,
  contaId,
  contaNome,
  categorias,
  contatos,
  linhas,
}: {
  itens: MovimentacaoResumo[];
  contaId: string;
  contaNome: string;
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
}) {
  const [abertoId, setAbertoId] = useState<string | null>(null);

  if (itens.length === 0) {
    return (
      <EmptyState
        icone={Receipt}
        titulo="Nada nesta fatura"
        descricao="Nenhuma compra caiu neste ciclo ainda."
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {itens.map((mov) => (
          <TransactionRow key={mov.id} movimentacao={mov} aoAbrir={setAbertoId} />
        ))}
      </div>

      <DetalheMovimentacaoSheet
        movimentacao={itens.find((m) => m.id === abertoId) ?? null}
        contas={[{ id: contaId, nome: contaNome }]}
        categorias={categorias}
        contatos={contatos}
        linhas={linhas}
        aoFechar={() => setAbertoId(null)}
      />
    </>
  );
}
