"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Building2, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { FormularioEmpresa } from "@/features/console/formulario-empresa";
import { LinhaEmpresaConsole } from "@/features/console/linha-empresa";
import { criarEmpresa, editarEmpresa, alternarEmpresaAtiva } from "@/services/console/actions";
import type {
  EmpresaConsole,
  FormularioEmpresaConsole as DadosFormulario,
} from "@/services/console/dto";

export function GerenciadorEmpresasConsole({ inicial }: { inicial: EmpresaConsole[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState<EmpresaConsole | null | "nova">(null);

  function salvar(dados: DadosFormulario) {
    startTransition(async () => {
      if (dados.id) {
        await editarEmpresa(dados.id, { nome: dados.nome, slug: dados.slug, cnpj: dados.cnpj });
      } else {
        await criarEmpresa({ nome: dados.nome, slug: dados.slug, cnpj: dados.cnpj });
      }
      setEditando(null);
      router.refresh();
    });
  }

  function alternarAtiva(id: string) {
    startTransition(async () => {
      await alternarEmpresaAtiva(id);
      setEditando(null);
      router.refresh();
    });
  }

  const empresaEmEdicao = editando === "nova" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setEditando("nova")} disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          Nova empresa
        </Button>
      </div>

      {inicial.length === 0 ? (
        <EmptyState icone={Building2} titulo="Nenhuma empresa" descricao="Cadastre a primeira empresa da plataforma." />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {inicial.map((empresa) => (
            <LinhaEmpresaConsole
              key={empresa.id}
              empresa={empresa}
              aoAbrir={(id) => setEditando(inicial.find((e) => e.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={empresaEmEdicao ? "Editar empresa" : "Nova empresa"}
        descricao="Nome, slug e CNPJ da empresa."
      >
        <FormularioEmpresa
          empresa={empresaEmEdicao}
          aoSalvar={salvar}
          aoAlternarAtiva={empresaEmEdicao ? alternarAtiva : undefined}
          aoCancelar={() => setEditando(null)}
        />
      </ResponsiveModal>
    </div>
  );
}
