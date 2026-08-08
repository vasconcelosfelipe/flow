"use client";

import { useRouter } from "next/navigation";
import { useTransition, useMemo, useState } from "react";
import { Plus, Tags } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FORM_ID_CATEGORIA, FormularioCategoria } from "@/features/categorias/formulario-categoria";
import { LinhaCategoria } from "@/features/categorias/linha-categoria";
import { criarCategoria, editarCategoria, excluirCategoria } from "@/services/categorias/actions";
import type { CategoriaCompleta, FormularioCategoria as DadosFormulario } from "@/services/categorias/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa, TipoMovimentacao } from "@/types/dominio";

export function GerenciadorCategorias({
  inicial,
  linhas,
  tipoEspaco,
  somenteLeitura = false,
}: {
  inicial: CategoriaCompleta[];
  linhas: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  somenteLeitura?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aba, setAba] = useState<TipoMovimentacao>("DESPESA");
  const [editando, setEditando] = useState<CategoriaCompleta | null | "nova">(null);

  const visiveis = useMemo(() => inicial.filter((c) => c.tipo === aba), [inicial, aba]);

  // Árvore de um nível: raízes (sem pai, ou cujo pai não está mais na lista
  // ativa) seguidas de suas subcategorias, na ordem em que já vêm (por nome).
  const arvore = useMemo(() => {
    const raizes = visiveis.filter(
      (c) => c.categoriaPaiId === null || !visiveis.some((p) => p.id === c.categoriaPaiId),
    );
    return raizes.map((raiz) => ({
      raiz,
      filhas: visiveis.filter((c) => c.categoriaPaiId === raiz.id),
    }));
  }, [visiveis]);

  function salvar(dados: DadosFormulario) {
    startTransition(async () => {
      if (dados.id) {
        await editarCategoria(dados.id, dados);
      } else {
        await criarCategoria(dados);
      }
      setEditando(null);
      router.refresh();
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      await excluirCategoria(id);
      setEditando(null);
      router.refresh();
    });
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

        {!somenteLeitura && (
          <Button size="sm" className="gap-1.5" onClick={() => setEditando("nova")} disabled={pending}>
            <Plus className="size-4" aria-hidden="true" />
            Nova
          </Button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          icone={Tags}
          titulo="Nenhuma categoria"
          descricao="Crie a primeira categoria deste tipo para começar a classificar lançamentos."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {arvore.map(({ raiz, filhas }) => (
            <div key={raiz.id} className="divide-y divide-line">
              <LinhaCategoria
                categoria={raiz}
                aoAbrir={somenteLeitura ? () => {} : (id) => setEditando(inicial.find((c) => c.id === id) ?? null)}
              />
              {filhas.map((filha) => (
                <LinhaCategoria
                  key={filha.id}
                  categoria={filha}
                  subcategoria
                  aoAbrir={somenteLeitura ? () => {} : (id) => setEditando(inicial.find((c) => c.id === id) ?? null)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={categoriaEmEdicao ? "Editar categoria" : "Nova categoria"}
        descricao="Nome, tipo, linha da DRE, categoria pai, cor e ícone da categoria."
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
            <Button type="submit" form={FORM_ID_CATEGORIA} className="flex-1" disabled={pending}>
              Salvar
            </Button>
          </>
        }
      >
        <FormularioCategoria
          categoria={categoriaEmEdicao}
          categorias={inicial}
          linhas={linhas}
          tipoEspaco={tipoEspaco}
          tipoPadrao={aba}
          aoSalvar={salvar}
          aoExcluir={categoriaEmEdicao ? excluir : undefined}
        />
      </ResponsiveModal>
    </div>
  );
}
