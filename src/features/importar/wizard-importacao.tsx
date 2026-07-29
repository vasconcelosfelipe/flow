"use client";

import { useState } from "react";

import { PassoConfirmacao } from "@/features/importar/passo-confirmacao";
import { PassoRevisao } from "@/features/importar/passo-revisao";
import { PassoUpload } from "@/features/importar/passo-upload";
import { cn } from "@/lib/utils";
import { processarArquivo } from "@/services/importacao";
import type { ResumoImportacao } from "@/services/importacao/dto";

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
export function WizardImportacao() {
  const [passo, setPasso] = useState<Passo>("upload");
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);

  function processar(arquivoNome: string, contaId: string) {
    setResumo(processarArquivo(arquivoNome, contaId));
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

  function reiniciar() {
    setResumo(null);
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

      {passo === "upload" && <PassoUpload aoProcessar={processar} />}

      {passo === "revisao" && resumo && (
        <PassoRevisao
          arquivoNome={resumo.arquivoNome}
          linhas={resumo.linhas}
          aoAlternarLinha={alternarLinha}
          aoVoltar={reiniciar}
          aoConfirmar={() => setPasso("confirmacao")}
        />
      )}

      {passo === "confirmacao" && resumo && (
        <PassoConfirmacao
          incluidas={resumo.linhas.filter((l) => l.incluir)}
          aoImportarOutro={reiniciar}
        />
      )}
    </div>
  );
}
