"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinhaImportacao } from "@/features/importar/linha-importacao";
import type { LinhaImportacao as TipoLinha, StatusLinhaImportacao } from "@/services/importacao/dto";
import { cn } from "@/lib/utils";

type OpcaoCategoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };
type OpcaoContato = { id: string; nome: string };
type Aba = "todas" | StatusLinhaImportacao;

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "NOVA", rotulo: "Novas" },
  { valor: "CONCILIAVEL", rotulo: "Conciliáveis" },
  { valor: "DUPLICADA", rotulo: "Duplicadas" },
];

/**
 * Segundo passo: a pessoa confirma o que entra. Duplicadas nascem
 * desmarcadas — importar de novo o que já está no extrato é o erro mais caro
 * desta tela, então o padrão protege contra ele.
 */
export function PassoRevisao({
  arquivoNome,
  linhas,
  categorias,
  contatos,
  confirmando,
  aoAlternarLinha,
  aoAtualizarLinha,
  aoVoltar,
  aoConfirmar,
}: {
  arquivoNome: string;
  linhas: TipoLinha[];
  categorias: OpcaoCategoria[];
  contatos: OpcaoContato[];
  confirmando: boolean;
  aoAlternarLinha: (id: string) => void;
  aoAtualizarLinha: (id: string, ajuste: { categoriaId?: string | null; contatoId?: string | null }) => void;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}) {
  const [aba, setAba] = useState<Aba>("todas");

  const contagens = useMemo(
    () => ({
      todas: linhas.length,
      NOVA: linhas.filter((l) => l.status === "NOVA").length,
      CONCILIAVEL: linhas.filter((l) => l.status === "CONCILIAVEL").length,
      DUPLICADA: linhas.filter((l) => l.status === "DUPLICADA").length,
    }),
    [linhas],
  );

  const visiveis = aba === "todas" ? linhas : linhas.filter((l) => l.status === aba);
  const selecionadas = linhas.filter((l) => l.incluir).length;

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <p className="text-micro text-ink-muted">Arquivo</p>
        <p className="truncate font-medium text-ink">{arquivoNome}</p>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
        <TabsList className="scrollbar-none h-10 w-full overflow-x-auto">
          {ABAS.map((a) => (
            <TabsTrigger key={a.valor} value={a.valor} className="flex-1 gap-1">
              {a.rotulo}
              <span className={cn("text-ink-muted", aba === a.valor && "text-brand")}>
                {contagens[a.valor === "todas" ? "todas" : a.valor]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {visiveis.map((linha) => (
          <LinhaImportacao
            key={linha.id}
            linha={linha}
            categorias={categorias}
            contatos={contatos}
            aoAlternar={aoAlternarLinha}
            aoAtualizar={aoAtualizarLinha}
          />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm md:bottom-0 md:left-20 md:pb-4">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3">
          <Button variant="outline" onClick={aoVoltar} disabled={confirmando}>
            Voltar
          </Button>
          <Button
            className="flex-1"
            disabled={selecionadas === 0 || confirmando}
            onClick={aoConfirmar}
          >
            {confirmando
              ? "Importando…"
              : `Importar ${selecionadas} ${selecionadas === 1 ? "lançamento" : "lançamentos"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
