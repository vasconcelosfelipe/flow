"use client";

import { useRouter } from "next/navigation";
import { useTransition, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FORM_ID_CONTATO, FormularioContato } from "@/features/contatos/formulario-contato";
import { LinhaContato } from "@/features/contatos/linha-contato";
import { criarContato, editarContato, excluirContato } from "@/services/contatos/actions";
import type { ContatoCompleto, FormularioContato as DadosFormulario } from "@/services/contatos/dto";

export function GerenciadorContatos({ inicial }: { inicial: ContatoCompleto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ContatoCompleto | null | "novo">(null);

  const visiveis = useMemo(() => {
    if (!busca.trim()) return inicial;
    const alvo = busca.trim().toLocaleLowerCase("pt-BR");
    return inicial.filter((c) => c.nome.toLocaleLowerCase("pt-BR").includes(alvo));
  }, [inicial, busca]);

  function salvar(dados: DadosFormulario) {
    startTransition(async () => {
      if (dados.id) {
        await editarContato(dados.id, dados);
      } else {
        await criarContato(dados);
      }
      setEditando(null);
      router.refresh();
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      await excluirContato(id);
      setEditando(null);
      router.refresh();
    });
  }

  const contatoEmEdicao = editando === "novo" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar fornecedor/cliente…"
          className="h-10 flex-1 rounded-xl border-line bg-surface px-3"
        />
        <Button size="sm" className="h-10 gap-1.5 px-3" onClick={() => setEditando("novo")} disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          Novo
        </Button>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          icone={Users}
          titulo="Nenhum fornecedor/cliente"
          descricao="Cadastre fornecedores e clientes para vinculá-los às movimentações."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {visiveis.map((contato) => (
            <LinhaContato
              key={contato.id}
              contato={contato}
              aoAbrir={(id) => setEditando(inicial.find((c) => c.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={contatoEmEdicao ? "Editar fornecedor/cliente" : "Novo fornecedor/cliente"}
        descricao="Nome e documento do fornecedor/cliente."
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
            <Button type="submit" form={FORM_ID_CONTATO} className="flex-1" disabled={pending}>
              Salvar
            </Button>
          </>
        }
      >
        <FormularioContato
          contato={contatoEmEdicao}
          aoSalvar={salvar}
          aoExcluir={contatoEmEdicao ? excluir : undefined}
        />
      </ResponsiveModal>
    </div>
  );
}
