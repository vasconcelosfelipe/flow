"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormularioContato } from "@/features/contatos/formulario-contato";
import { LinhaContato } from "@/features/contatos/linha-contato";
import type { ContatoCompleto, FormularioContato as DadosFormulario } from "@/services/contatos/dto";

export function GerenciadorContatos({ inicial }: { inicial: ContatoCompleto[] }) {
  const [contatos, setContatos] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ContatoCompleto | null | "novo">(null);

  const visiveis = useMemo(() => {
    if (!busca.trim()) return contatos;
    const alvo = busca.trim().toLocaleLowerCase("pt-BR");
    return contatos.filter((c) => c.nome.toLocaleLowerCase("pt-BR").includes(alvo));
  }, [contatos, busca]);

  function salvar(dados: DadosFormulario) {
    setContatos((atuais) => {
      if (dados.id) {
        return atuais.map((c) =>
          c.id === dados.id ? { ...c, nome: dados.nome, tipo: dados.tipo, documento: dados.documento } : c,
        );
      }

      const novo: ContatoCompleto = {
        id: `ctt_custom_${Date.now()}`,
        nome: dados.nome,
        tipo: dados.tipo,
        documento: dados.documento,
        quantidadeMovimentacoes: 0,
      };
      return [...atuais, novo];
    });
    setEditando(null);
  }

  function excluir(id: string) {
    setContatos((atuais) => atuais.filter((c) => c.id !== id));
    setEditando(null);
  }

  const contatoEmEdicao = editando === "novo" ? null : editando;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar contato…"
          className="h-10 flex-1 rounded-xl border-line bg-surface px-3"
        />
        <Button size="sm" className="h-10 gap-1.5 px-3" onClick={() => setEditando("novo")}>
          <Plus className="size-4" aria-hidden="true" />
          Novo
        </Button>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          icone={Users}
          titulo="Nenhum contato"
          descricao="Cadastre clientes e fornecedores para vinculá-los às movimentações."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {visiveis.map((contato) => (
            <LinhaContato
              key={contato.id}
              contato={contato}
              aoAbrir={(id) => setEditando(contatos.find((c) => c.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={editando !== null}
        aoMudarAberto={(aberto) => !aberto && setEditando(null)}
        titulo={contatoEmEdicao ? "Editar contato" : "Novo contato"}
        descricao="Nome, tipo e documento do contato."
      >
        <FormularioContato
          contato={contatoEmEdicao}
          aoSalvar={salvar}
          aoExcluir={contatoEmEdicao ? excluir : undefined}
          aoCancelar={() => setEditando(null)}
        />
      </ResponsiveModal>
    </div>
  );
}
