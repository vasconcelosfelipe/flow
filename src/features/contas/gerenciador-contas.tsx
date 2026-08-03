"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Plus, Wallet } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { FORM_ID_CONTA, FormularioConta } from "@/features/contas/formulario-conta";
import { LinhaConta } from "@/features/contas/linha-conta";
import { criarConta, editarConta, excluirConta } from "@/services/contas/actions";
import type { ContaCompleta, FormularioConta as DadosFormulario } from "@/services/contas/dto";

export function GerenciadorContas({ inicial }: { inicial: ContaCompleta[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState<ContaCompleta | null | "nova">(null);

  const saldoTotal = inicial.reduce((soma, c) => soma + c.saldoCentavos, 0);

  function salvar(dados: DadosFormulario) {
    startTransition(async () => {
      if (dados.id) {
        await editarConta(dados.id, dados);
      } else {
        await criarConta(dados);
      }
      setEditando(null);
      router.refresh();
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      await excluirConta(id);
      setEditando(null);
      router.refresh();
    });
  }

  const contaEmEdicao = editando === "nova" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <p className="text-nano font-medium tracking-wide text-ink-muted uppercase">Saldo total</p>
        <AmountText centavos={saldoTotal} tamanho="lg" tom="neutro" className="mt-1 block" />
        <p className="mt-1 text-nano text-ink-muted">
          {inicial.length} {inicial.length === 1 ? "conta" : "contas"}
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setEditando("nova")} disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          Nova
        </Button>
      </div>

      {inicial.length === 0 ? (
        <EmptyState
          icone={Wallet}
          titulo="Nenhuma conta cadastrada"
          descricao="Crie a primeira conta para começar a registrar movimentações."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {inicial.map((conta) => (
            <LinhaConta
              key={conta.id}
              conta={conta}
              aoAbrir={(id) => setEditando(inicial.find((c) => c.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={contaEmEdicao ? "Editar conta" : "Nova conta"}
        descricao="Nome, tipo e cor da conta."
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setEditando(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID_CONTA} className="flex-1" disabled={pending}>
              Salvar
            </Button>
          </>
        }
      >
        <FormularioConta
          conta={contaEmEdicao}
          aoSalvar={salvar}
          aoExcluir={contaEmEdicao ? excluir : undefined}
        />
      </ResponsiveModal>
    </div>
  );
}
