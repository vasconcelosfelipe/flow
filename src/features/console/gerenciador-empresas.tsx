"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { FormularioEmpresa } from "@/features/console/formulario-empresa";
import { LinhaEmpresaConsole } from "@/features/console/linha-empresa";
import type {
  EmpresaConsole,
  FormularioEmpresaConsole as DadosFormulario,
} from "@/services/console/dto";

export function GerenciadorEmpresasConsole({ inicial }: { inicial: EmpresaConsole[] }) {
  const [empresas, setEmpresas] = useState(inicial);
  const [editando, setEditando] = useState<EmpresaConsole | null | "nova">(null);

  function salvar(dados: DadosFormulario) {
    setEmpresas((atuais) => {
      if (dados.id) {
        return atuais.map((e) =>
          e.id === dados.id ? { ...e, nome: dados.nome, slug: dados.slug, cnpj: dados.cnpj } : e,
        );
      }

      const nova: EmpresaConsole = {
        id: `emp_custom_${Date.now()}`,
        nome: dados.nome,
        slug: dados.slug,
        cnpj: dados.cnpj,
        ativa: true,
        quantidadeUsuarios: 0,
        criadaEm: new Date(),
      };
      return [...atuais, nova];
    });
    setEditando(null);
  }

  function alternarAtiva(id: string) {
    setEmpresas((atuais) => atuais.map((e) => (e.id === id ? { ...e, ativa: !e.ativa } : e)));
    setEditando(null);
  }

  const empresaEmEdicao = editando === "nova" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setEditando("nova")}>
          <Plus className="size-4" aria-hidden="true" />
          Nova empresa
        </Button>
      </div>

      {empresas.length === 0 ? (
        <EmptyState icone={Building2} titulo="Nenhuma empresa" descricao="Cadastre a primeira empresa da plataforma." />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {empresas.map((empresa) => (
            <LinhaEmpresaConsole
              key={empresa.id}
              empresa={empresa}
              aoAbrir={(id) => setEditando(empresas.find((e) => e.id === id) ?? null)}
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
