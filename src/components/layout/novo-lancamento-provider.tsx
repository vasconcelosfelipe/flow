"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import {
  ModalNovaMovimentacao,
  type OpcaoConta,
  type PrefillMovimentacao,
} from "@/features/movimentacoes/nova-movimentacao";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

type NovoLancamentoContextValue = {
  /** Sem argumento: formulário em branco. Com `prefill`: "Duplicar
   * movimentação" (ver `detalhe-sheet.tsx`) — abre já preenchido. */
  abrir: (prefill?: PrefillMovimentacao) => void;
};

const NovoLancamentoContext = createContext<NovoLancamentoContextValue | null>(null);

/** Usado pelo "+" da navegação (bottom nav / rail), pelo botão "Nova" da
 * tela de Movimentações e por "Duplicar" no detalhe — todos disparam o
 * mesmo modal global. */
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
  empresaId,
  contas,
  categorias,
  contatos,
  linhas,
  tipoEspaco,
  somenteLeitura = false,
  children,
}: {
  /** Só usado como `key` do modal — força remontar (e reler as props do
   * zero) quando o espaço ativo muda. Sem isso, `ModalNovaMovimentacao`
   * guarda contas/categorias/contatos num `useState` que só lê o valor
   * inicial na primeira montagem: como o modal nunca desmonta sozinho
   * (vive fixo no layout pro "+" funcionar em qualquer tela), trocar de
   * espaço atualizava as props mas o formulário continuava mostrando as
   * categorias do espaço anterior. */
  empresaId: string;
  contas: OpcaoConta[];
  categorias: CategoriaCompleta[];
  contatos: ContatoCompleto[];
  linhas: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  somenteLeitura?: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [prefill, setPrefill] = useState<PrefillMovimentacao | null>(null);

  function abrir(dadosPrefill?: PrefillMovimentacao) {
    setPrefill(dadosPrefill ?? null);
    setAberto(true);
  }

  return (
    <NovoLancamentoContext.Provider value={{ abrir }}>
      {children}
      {!somenteLeitura && (
        <ModalNovaMovimentacao
          key={empresaId}
          aberto={aberto}
          aoMudarAberto={setAberto}
          contas={contas}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
          tipoEspaco={tipoEspaco}
          prefill={prefill}
        />
      )}
    </NovoLancamentoContext.Provider>
  );
}
