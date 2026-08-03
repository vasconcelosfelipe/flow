"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Plus, Tags } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { FORM_ID_CENTRO_CUSTO, FormularioCentroCusto } from "@/features/centros-custo/formulario-centro-custo";
import { LinhaCentroCusto } from "@/features/centros-custo/linha-centro-custo";
import { criarCentroCusto, editarCentroCusto, excluirCentroCusto } from "@/services/centros-custo/actions";
import type {
  CentroCustoCompleto,
  FormularioCentroCusto as DadosFormulario,
} from "@/services/centros-custo/dto";

export function GerenciadorCentrosCusto({ inicial }: { inicial: CentroCustoCompleto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState<CentroCustoCompleto | null | "novo">(null);

  function salvar(dados: DadosFormulario) {
    startTransition(async () => {
      if (dados.id) {
        await editarCentroCusto(dados.id, dados);
      } else {
        await criarCentroCusto(dados);
      }
      setEditando(null);
      router.refresh();
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      await excluirCentroCusto(id);
      setEditando(null);
      router.refresh();
    });
  }

  const centroEmEdicao = editando === "novo" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setEditando("novo")} disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          Novo
        </Button>
      </div>

      {inicial.length === 0 ? (
        <EmptyState
          icone={Tags}
          titulo="Nenhum centro de custo"
          descricao="Crie centros de custo para ratear despesas entre áreas do negócio."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {inicial.map((centro) => (
            <LinhaCentroCusto
              key={centro.id}
              centro={centro}
              aoAbrir={(id) => setEditando(inicial.find((c) => c.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={centroEmEdicao ? "Editar centro de custo" : "Novo centro de custo"}
        descricao="Nome e cor do centro de custo."
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
            <Button type="submit" form={FORM_ID_CENTRO_CUSTO} className="flex-1" disabled={pending}>
              Salvar
            </Button>
          </>
        }
      >
        <FormularioCentroCusto
          centro={centroEmEdicao}
          aoSalvar={salvar}
          aoExcluir={centroEmEdicao ? excluir : undefined}
        />
      </ResponsiveModal>
    </div>
  );
}
