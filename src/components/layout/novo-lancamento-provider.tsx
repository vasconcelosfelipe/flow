"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { ModalNovaMovimentacao, type OpcaoConta } from "@/features/movimentacoes/nova-movimentacao";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

type NovoLancamentoContextValue = {
  abrir: () => void;
};

const NovoLancamentoContext = createContext<NovoLancamentoContextValue | null>(null);

/** Usado pelo "+" da navegação (bottom nav / rail) e pelo botão "Nova" da
 * tela de Movimentações — os dois disparam o mesmo modal global. */
export function useNovoLancamento() {
  const ctx = useContext(NovoLancamentoContext);
  if (!ctx) {
    throw new Error("useNovoLancamento precisa estar dentro de NovoLancamentoProvider");
  }
  return ctx;
}

/**
 * Monta o modal de novo lançamento UMA vez, no layout raiz — evita que cada
 * tela precise da própria busca de contas/categorias/contatos/linhas só pra
 * poder abrir o mesmo formulário. Em espaço somente leitura, nem monta o
 * modal (`ModalNovaMovimentacao` chama Server Actions que já são bloqueadas
 * pra LEITOR — aqui é só sobre nem oferecer a UI).
 */
export function NovoLancamentoProvider({
  contas,
  categorias,
  contatos,
  linhas,
  tipoEspaco,
  somenteLeitura = false,
  children,
}: {
  contas: OpcaoConta[];
  categorias: CategoriaCompleta[];
  contatos: ContatoCompleto[];
  linhas: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  somenteLeitura?: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <NovoLancamentoContext.Provider value={{ abrir: () => setAberto(true) }}>
      {children}
      {!somenteLeitura && (
        <ModalNovaMovimentacao
          aberto={aberto}
          aoMudarAberto={setAberto}
          contas={contas}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
          tipoEspaco={tipoEspaco}
        />
      )}
    </NovoLancamentoContext.Provider>
  );
}
