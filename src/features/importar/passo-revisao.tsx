"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinhaImportacao } from "@/features/importar/linha-importacao";
import type { LinhaImportacao as TipoLinha, StatusLinhaImportacao } from "@/services/importacao/dto";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";
import { cn } from "@/lib/utils";

type OpcaoConta = { id: string; nome: string };
type Aba = "todas" | StatusLinhaImportacao;

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "NOVA", rotulo: "Novas" },
  { valor: "CONCILIAVEL", rotulo: "Conciliáveis" },
  { valor: "DUPLICADA", rotulo: "Duplicadas" },
  { valor: "IGNORADA", rotulo: "Ignoradas" },
];

/**
 * Segundo passo: a pessoa confirma o que entra. Duplicadas nascem
 * desmarcadas — importar de novo o que já está no extrato é o erro mais caro
 * desta tela, então o padrão protege contra ele.
 */
export function PassoRevisao({
  arquivoNome,
  contaAtualId,
  contaAtualNome,
  linhas,
  contas,
  categorias,
  contatos,
  linhasDre,
  tipoEspaco,
  confirmando,
  aoAlternarLinha,
  aoAtualizarLinha,
  aoAlternarIgnorarPermanentemente,
  aoCriarCategoria,
  aoCriarContato,
  aoVoltar,
  aoConfirmar,
}: {
  arquivoNome: string;
  /** Conta do extrato sendo importado — nunca aparece como opção de "outro lado" da transferência. */
  contaAtualId: string;
  contaAtualNome: string;
  linhas: TipoLinha[];
  contas: OpcaoConta[];
  categorias: CategoriaCompleta[];
  contatos: ContatoCompleto[];
  linhasDre: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  confirmando: boolean;
  aoAlternarLinha: (id: string) => void;
  aoAtualizarLinha: (
    id: string,
    ajuste: {
      categoriaId?: string | null;
      contatoId?: string | null;
      origemSugestao?: "ia" | "trigrama" | null;
      descricao?: string;
      ehTransferencia?: boolean;
      contaTransferenciaId?: string | null;
    },
  ) => void;
  aoAlternarIgnorarPermanentemente: (id: string) => void;
  aoCriarCategoria: (categoria: CategoriaCompleta) => void;
  aoCriarContato: (contato: ContatoCompleto) => void;
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
      IGNORADA: linhas.filter((l) => l.status === "IGNORADA").length,
    }),
    [linhas],
  );

  const visiveis = aba === "todas" ? linhas : linhas.filter((l) => l.status === aba);
  const incluidas = linhas.filter((l) => l.incluir);
  const selecionadas = incluidas.length;
  const ignorando = linhas.filter((l) => l.ignorarPermanentemente).length;
  // Marcou como transferência mas não escolheu "o outro lado" ainda — não dá
  // pra confirmar sem isso, a linha ficaria sem conta de destino/origem.
  const transferenciaIncompleta = incluidas.some(
    (l) => l.ehTransferencia && !l.contaTransferenciaId,
  );

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="min-w-0 flex-1">
          <p className="text-micro text-ink-muted">Arquivo</p>
          <p className="truncate font-medium text-ink">{arquivoNome}</p>
        </div>
        <div className="min-w-0 flex-1 border-l border-line pl-4">
          <p className="text-micro text-ink-muted">Conta</p>
          <p className="truncate font-medium text-ink">{contaAtualNome}</p>
        </div>
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
            contas={contas.filter((c) => c.id !== contaAtualId)}
            categorias={categorias}
            contatos={contatos}
            linhasDre={linhasDre}
            tipoEspaco={tipoEspaco}
            aoAlternar={aoAlternarLinha}
            aoAtualizar={aoAtualizarLinha}
            aoAlternarIgnorarPermanentemente={aoAlternarIgnorarPermanentemente}
            aoCriarCategoria={aoCriarCategoria}
            aoCriarContato={aoCriarContato}
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
            disabled={(selecionadas === 0 && ignorando === 0) || confirmando || transferenciaIncompleta}
            onClick={aoConfirmar}
          >
            {confirmando
              ? "Importando…"
              : transferenciaIncompleta
                ? "Escolha a conta da transferência"
                : selecionadas === 0
                  ? `Ignorar ${ignorando} ${ignorando === 1 ? "lançamento" : "lançamentos"}`
                  : `Importar ${selecionadas} ${selecionadas === 1 ? "lançamento" : "lançamentos"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
