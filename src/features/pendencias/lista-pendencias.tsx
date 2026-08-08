"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  somenteLeitura = false,
}: {
  itens: MovimentacaoResumo[];
  contas?: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  somenteLeitura?: boolean;
}) {
  const router = useRouter();
  const [abertoId, setAbertoId] = useState<string | null>(null);

  // "fatura-<contaId>" é uma linha sintética (saldo devedor do cartão, não
  // uma Movimentacao) — não tem o que editar num sheet, leva direto pra
  // tela da fatura.
  function aoAbrir(id: string) {
    if (id.startsWith("fatura-")) {
      router.push(`/contas/${id.slice("fatura-".length)}/fatura`);
      return;
    }
    setAbertoId(id);
  }

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
          <LinhaPendencia key={mov.id} movimentacao={mov} aoAbrir={aoAbrir} />
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
          somenteLeitura={somenteLeitura}
        />
      )}
    </div>
  );
}
