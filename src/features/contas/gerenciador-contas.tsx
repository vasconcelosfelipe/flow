"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { FormularioConta } from "@/features/contas/formulario-conta";
import { LinhaConta } from "@/features/contas/linha-conta";
import type { ContaCompleta, FormularioConta as DadosFormulario } from "@/services/contas/dto";

/**
 * Dono do estado das contas na Fase 1: sem backend, a lista vive aqui e
 * volta ao mock a cada recarregamento. Fase 2 troca isto por mutações do
 * Prisma — a lista, o formulário e a regra de não excluir em uso não mudam.
 */
export function GerenciadorContas({ inicial }: { inicial: ContaCompleta[] }) {
  const [contas, setContas] = useState(inicial);
  const [editando, setEditando] = useState<ContaCompleta | null | "nova">(null);

  const saldoTotal = contas.reduce((soma, c) => soma + c.saldoCentavos, 0);

  function salvar(dados: DadosFormulario) {
    setContas((atuais) => {
      if (dados.id) {
        return atuais.map((c) =>
          c.id === dados.id ? { ...c, nome: dados.nome, tipo: dados.tipo, cor: dados.cor } : c,
        );
      }

      const nova: ContaCompleta = {
        id: `cta_custom_${Date.now()}`,
        nome: dados.nome,
        tipo: dados.tipo,
        cor: dados.cor,
        saldoCentavos: 0,
        quantidadeMovimentacoes: 0,
      };
      return [...atuais, nova];
    });
    setEditando(null);
  }

  function excluir(id: string) {
    setContas((atuais) => atuais.filter((c) => c.id !== id));
    setEditando(null);
  }

  const contaEmEdicao = editando === "nova" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <p className="text-nano font-medium tracking-wide text-ink-muted uppercase">Saldo total</p>
        <AmountText centavos={saldoTotal} tamanho="lg" tom="neutro" className="mt-1 block" />
        <p className="mt-1 text-nano text-ink-muted">
          {contas.length} {contas.length === 1 ? "conta" : "contas"}
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setEditando("nova")}>
          <Plus className="size-4" aria-hidden="true" />
          Nova
        </Button>
      </div>

      {contas.length === 0 ? (
        <EmptyState
          icone={Wallet}
          titulo="Nenhuma conta cadastrada"
          descricao="Crie a primeira conta para começar a registrar movimentações."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {contas.map((conta) => (
            <LinhaConta
              key={conta.id}
              conta={conta}
              aoAbrir={(id) => setEditando(contas.find((c) => c.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={contaEmEdicao ? "Editar conta" : "Nova conta"}
        descricao="Nome, tipo e cor da conta."
      >
        <FormularioConta
          conta={contaEmEdicao}
          aoSalvar={salvar}
          aoExcluir={contaEmEdicao ? excluir : undefined}
          aoCancelar={() => setEditando(null)}
        />
      </ResponsiveModal>
    </div>
  );
}
