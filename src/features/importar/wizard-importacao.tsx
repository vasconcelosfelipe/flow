"use client";

import { useState } from "react";

import { PassoConfirmacao } from "@/features/importar/passo-confirmacao";
import { PassoRevisao } from "@/features/importar/passo-revisao";
import { PassoUpload } from "@/features/importar/passo-upload";
import { cn } from "@/lib/utils";
import { confirmarImportacao } from "@/services/importacao/actions";
import type { ResultadoConfirmacao, ResumoImportacao } from "@/services/importacao/dto";

type OpcaoConta = { id: string; nome: string };
type OpcaoCategoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };
type OpcaoContato = { id: string; nome: string };
type Passo = "upload" | "revisao" | "confirmacao";

const PASSOS: { chave: Passo; rotulo: string }[] = [
  { chave: "upload", rotulo: "Arquivo" },
  { chave: "revisao", rotulo: "Revisão" },
  { chave: "confirmacao", rotulo: "Concluído" },
];

/**
 * Orquestra os três passos e guarda a seleção de linhas em memória — nada
 * disto precisa da URL porque a importação não é um estado para compartilhar
 * ou revisitar, é uma tarefa que se conclui numa sentada.
 */
export function WizardImportacao({
  contas,
  categorias = [],
  contatos = [],
}: {
  contas: OpcaoConta[];
  categorias?: OpcaoCategoria[];
  contatos?: OpcaoContato[];
}) {
  const [passo, setPasso] = useState<Passo>("upload");
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConfirmacao | null>(null);

  function processar(novoResumo: ResumoImportacao) {
    setResumo(novoResumo);
    setPasso("revisao");
  }

  function alternarLinha(id: string) {
    setResumo((atual) =>
      atual
        ? {
            ...atual,
            linhas: atual.linhas.map((l) => (l.id === id ? { ...l, incluir: !l.incluir } : l)),
          }
        : atual,
    );
  }

  function atualizarLinha(id: string, ajuste: { categoriaId?: string | null; contatoId?: string | null }) {
    setResumo((atual) =>
      atual
        ? {
            ...atual,
            linhas: atual.linhas.map((l) => (l.id === id ? { ...l, ...ajuste } : l)),
          }
        : atual,
    );
  }

  async function confirmar() {
    if (!resumo) return;
    setConfirmando(true);
    try {
      const selecionadas = resumo.linhas.filter((l) => l.incluir);
      const r = await confirmarImportacao({
        nomeArquivo: resumo.arquivoNome,
        contaId: resumo.conta.id,
        linhas: selecionadas,
      });
      setResultado(r);
      setPasso("confirmacao");
    } finally {
      setConfirmando(false);
    }
  }

  function reiniciar() {
    setResumo(null);
    setResultado(null);
    setPasso("upload");
  }

  const indiceAtual = PASSOS.findIndex((p) => p.chave === passo);

  return (
    <div>
      <ol className="mb-6 flex items-center gap-2">
        {PASSOS.map((p, indice) => (
          <li key={p.chave} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-nano font-semibold",
                indice < indiceAtual && "bg-positive-text text-white",
                indice === indiceAtual && "bg-brand text-white",
                indice > indiceAtual && "bg-muted text-ink-muted",
              )}
            >
              {indice + 1}
            </span>
            <span
              className={cn(
                "text-micro font-medium",
                indice === indiceAtual ? "text-ink" : "text-ink-muted",
              )}
            >
              {p.rotulo}
            </span>
            {indice < PASSOS.length - 1 && (
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      {passo === "upload" && <PassoUpload contas={contas} aoProcessar={processar} />}

      {passo === "revisao" && resumo && (
        <PassoRevisao
          arquivoNome={resumo.arquivoNome}
          linhas={resumo.linhas}
          categorias={categorias}
          contatos={contatos}
          confirmando={confirmando}
          aoAlternarLinha={alternarLinha}
          aoAtualizarLinha={atualizarLinha}
          aoVoltar={reiniciar}
          aoConfirmar={confirmar}
        />
      )}

      {passo === "confirmacao" && resultado && (
        <PassoConfirmacao resultado={resultado} aoImportarOutro={reiniciar} />
      )}
    </div>
  );
}
