"use client";

import { useState } from "react";
import { Plus, Tags } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { FormularioCentroCusto } from "@/features/centros-custo/formulario-centro-custo";
import { LinhaCentroCusto } from "@/features/centros-custo/linha-centro-custo";
import type {
  CentroCustoCompleto,
  FormularioCentroCusto as DadosFormulario,
} from "@/services/centros-custo/dto";

export function GerenciadorCentrosCusto({ inicial }: { inicial: CentroCustoCompleto[] }) {
  const [centros, setCentros] = useState(inicial);
  const [editando, setEditando] = useState<CentroCustoCompleto | null | "novo">(null);

  function salvar(dados: DadosFormulario) {
    setCentros((atuais) => {
      if (dados.id) {
        return atuais.map((c) => (c.id === dados.id ? { ...c, nome: dados.nome, cor: dados.cor } : c));
      }

      const novo: CentroCustoCompleto = {
        id: `cc_custom_${Date.now()}`,
        nome: dados.nome,
        cor: dados.cor,
        quantidadeMovimentacoes: 0,
      };
      return [...atuais, novo];
    });
    setEditando(null);
  }

  function excluir(id: string) {
    setCentros((atuais) => atuais.filter((c) => c.id !== id));
    setEditando(null);
  }

  const centroEmEdicao = editando === "novo" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setEditando("novo")}>
          <Plus className="size-4" aria-hidden="true" />
          Novo
        </Button>
      </div>

      {centros.length === 0 ? (
        <EmptyState
          icone={Tags}
          titulo="Nenhum centro de custo"
          descricao="Crie centros de custo para ratear despesas entre áreas do negócio."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {centros.map((centro) => (
            <LinhaCentroCusto
              key={centro.id}
              centro={centro}
              aoAbrir={(id) => setEditando(centros.find((c) => c.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={centroEmEdicao ? "Editar centro de custo" : "Novo centro de custo"}
        descricao="Nome e cor do centro de custo."
      >
        <FormularioCentroCusto
          centro={centroEmEdicao}
          aoSalvar={salvar}
          aoExcluir={centroEmEdicao ? excluir : undefined}
          aoCancelar={() => setEditando(null)}
        />
      </ResponsiveModal>
    </div>
  );
}
