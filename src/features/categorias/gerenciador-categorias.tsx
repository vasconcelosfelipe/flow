"use client";

import { useMemo, useState } from "react";
import { Plus, Tags } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormularioCategoria } from "@/features/categorias/formulario-categoria";
import { LinhaCategoria } from "@/features/categorias/linha-categoria";
import { DEFINICAO_LINHAS } from "@/services/dre";
import type { CategoriaCompleta, FormularioCategoria as DadosFormulario } from "@/services/categorias/dto";
import type { TipoMovimentacao } from "@/types/dominio";

function resolverLinha(dados: DadosFormulario) {
  const linha = dados.linhaDreId ? DEFINICAO_LINHAS.find((l) => l.id === dados.linhaDreId) : undefined;
  return {
    linhaDreId: linha?.id ?? null,
    linhaDreNome: linha?.nome ?? "Sem conta de DRE vinculada",
    grupoDre: linha?.grupo ?? dados.tipo,
  };
}

/**
 * Dono do estado das categorias na Fase 1: sem backend, a lista vive aqui e
 * volta ao mock a cada recarregamento. Fase 2 troca isto por mutações do
 * Prisma — a lista, o formulário e as regras (não excluir em uso) não mudam.
 */
export function GerenciadorCategorias({ inicial }: { inicial: CategoriaCompleta[] }) {
  const [categorias, setCategorias] = useState(inicial);
  const [aba, setAba] = useState<TipoMovimentacao>("DESPESA");
  const [editando, setEditando] = useState<CategoriaCompleta | null | "nova">(null);

  const visiveis = useMemo(() => categorias.filter((c) => c.tipo === aba), [categorias, aba]);

  function salvar(dados: DadosFormulario) {
    const linha = resolverLinha(dados);

    setCategorias((atuais) => {
      if (dados.id) {
        return atuais.map((c) =>
          c.id === dados.id
            ? { ...c, nome: dados.nome, icone: dados.icone, cor: dados.cor, tipo: dados.tipo, ...linha }
            : c,
        );
      }

      const nova: CategoriaCompleta = {
        id: `cat_custom_${Date.now()}`,
        nome: dados.nome,
        icone: dados.icone,
        cor: dados.cor,
        tipo: dados.tipo,
        quantidadeMovimentacoes: 0,
        ...linha,
      };
      return [...atuais, nova];
    });
    setEditando(null);
  }

  function excluir(id: string) {
    setCategorias((atuais) => atuais.filter((c) => c.id !== id));
    setEditando(null);
  }

  const categoriaEmEdicao = editando === "nova" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Tabs value={aba} onValueChange={(v) => setAba(v as TipoMovimentacao)}>
          <TabsList className="h-9">
            <TabsTrigger value="DESPESA">Despesas</TabsTrigger>
            <TabsTrigger value="RECEITA">Receitas</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button size="sm" className="gap-1.5" onClick={() => setEditando("nova")}>
          <Plus className="size-4" aria-hidden="true" />
          Nova
        </Button>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          icone={Tags}
          titulo="Nenhuma categoria"
          descricao="Crie a primeira categoria deste tipo para começar a classificar lançamentos."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {visiveis.map((categoria) => (
            <LinhaCategoria
              key={categoria.id}
              categoria={categoria}
              aoAbrir={(id) => setEditando(categorias.find((c) => c.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={categoriaEmEdicao ? "Editar categoria" : "Nova categoria"}
        descricao="Nome, tipo, conta de DRE, cor e ícone da categoria."
      >
        <FormularioCategoria
          categoria={categoriaEmEdicao}
          aoSalvar={salvar}
          aoExcluir={categoriaEmEdicao ? excluir : undefined}
          aoCancelar={() => setEditando(null)}
        />
      </ResponsiveModal>
    </div>
  );
}
