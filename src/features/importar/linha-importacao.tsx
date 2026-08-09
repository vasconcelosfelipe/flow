"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronsUpDown, EyeOff, GitMerge, Link2, X } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { formatarData } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaImportacao } from "@/services/importacao/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

type OpcaoConta = { id: string; nome: string };

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";
const SEM_CONTA = "nenhuma";

const ROTULO_STATUS = {
  NOVA: "Nova",
  DUPLICADA: "Já importada",
  CONCILIAVEL: "Concilia",
  IGNORADA: "Ignorada",
} as const;

const ESTILO_STATUS = {
  NOVA: "bg-brand-wash text-brand",
  DUPLICADA: "bg-muted text-ink-muted",
  CONCILIAVEL: "bg-positive-wash text-positive-text",
  IGNORADA: "bg-muted text-ink-muted",
} as const;

/** Borda dos seletores de categoria/fornecedor denuncia de onde veio o
 * preenchimento automático — roxo pra IA, verde pro fallback de trigrama.
 * Some assim que a pessoa mexe manualmente (ver `origemSugestao: null` nos
 * `onValueChange` abaixo). */
const ESTILO_BORDA_SUGESTAO = {
  ia: "border-[#8b5cf6] ring-1 ring-[#8b5cf6]/30",
  trigrama: "border-positive ring-1 ring-positive/30",
  manual: "border-line",
} as const;

/**
 * Uma linha do extrato importado, ainda não confirmada.
 *
 * O selo de status é o primeiro dado, antes até da descrição — decidir "isso
 * é novo, já existe, ou fecha uma pendência" é o motivo desta tela existir, a
 * descrição em si é secundária.
 */
export function LinhaImportacao({
  linha,
  contas,
  categorias,
  contatos,
  linhasDre,
  tipoEspaco,
  aoAlternar,
  aoAtualizar,
  aoAlternarIgnorarPermanentemente,
  aoCriarCategoria,
  aoCriarContato,
}: {
  linha: LinhaImportacao;
  contas: OpcaoConta[];
  categorias: CategoriaCompleta[];
  contatos: ContatoCompleto[];
  linhasDre: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  aoAlternar: (id: string) => void;
  aoAtualizar: (
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
}) {
  const [modalAberto, setModalAberto] = useState<
    "categoria" | "contato" | "contaTransferencia" | null
  >(null);
  const receita = linha.tipo === "RECEITA";
  const categoriasDoTipo = categorias.filter((c) => c.tipo === linha.tipo);
  const categoriaSelecionada = categorias.find((c) => c.id === linha.categoriaId);
  const contatoSelecionado = contatos.find((c) => c.id === linha.contatoId);
  // Só linha ainda "acionável" (nova ou que fecha uma pendência) pode ser
  // marcada pra nunca mais ser sugerida — duplicada/ignorada já são inertes.
  const podeIgnorarPermanentemente = linha.status === "NOVA" || linha.status === "CONCILIAVEL";

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        linha.incluir ? "bg-surface" : "bg-muted/40",
      )}
    >
      <Checkbox
        checked={linha.incluir}
        onCheckedChange={() => aoAlternar(linha.id)}
        aria-label={`Incluir ${linha.descricao}`}
        className="mt-3.5 size-5"
      />

      <div className={cn("min-w-0 flex-1", !linha.incluir && "opacity-60")}>
        <div className="flex items-start gap-2">
          {linha.incluir ? (
            <div className="relative min-w-0 flex-1">
              <Input
                value={linha.descricao}
                onChange={(e) => aoAtualizar(linha.id, { descricao: e.target.value })}
                aria-label="Descrição do lançamento"
                className="h-8 w-full border-transparent bg-transparent px-1.5 pr-7 text-corpo font-medium text-ink shadow-none hover:border-line focus-visible:border-line focus-visible:bg-surface"
              />
              {linha.descricao && (
                <button
                  type="button"
                  onClick={() => aoAtualizar(linha.id, { descricao: "" })}
                  className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-muted"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Limpar descrição</span>
                </button>
              )}
            </div>
          ) : (
            <span className="truncate px-1.5 text-corpo font-medium text-ink">{linha.descricao}</span>
          )}
          <AmountText
            centavos={receita ? linha.valorCentavos : -linha.valorCentavos}
            tamanho="sm"
            className="mt-1 shrink-0"
          />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-nano font-medium",
              ESTILO_STATUS[linha.status],
            )}
          >
            {linha.status === "CONCILIAVEL" && <Link2 className="size-3" aria-hidden="true" />}
            {ROTULO_STATUS[linha.status]}
          </span>
          <span className="text-nano text-ink-muted">{formatarData(linha.data)}</span>
          {linha.categoriaSugerida && (
            <span className="text-nano text-ink-muted">· {linha.categoriaSugerida.nome}</span>
          )}
        </div>

        {linha.status === "CONCILIAVEL" && linha.conciliaCom && (
          <p className="mt-1.5 flex items-center gap-1 text-nano text-positive-text">
            <GitMerge className="size-3 shrink-0" aria-hidden="true" />
            Fecha a pendência de {linha.conciliaCom.contato?.nome ?? linha.conciliaCom.descricao}
          </p>
        )}

        {podeIgnorarPermanentemente && (
          <button
            type="button"
            onClick={() => aoAlternarIgnorarPermanentemente(linha.id)}
            className={cn(
              "mt-2 mr-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-nano font-medium transition-colors",
              linha.ignorarPermanentemente
                ? "bg-negative text-white"
                : "bg-muted text-ink-muted hover:bg-muted/70",
            )}
          >
            <EyeOff className="size-3" aria-hidden="true" />
            {linha.ignorarPermanentemente ? "Ignorada permanentemente" : "Ignorar permanentemente"}
          </button>
        )}

        {linha.incluir && (
          <>
            <button
              type="button"
              onClick={() =>
                aoAtualizar(linha.id, {
                  ehTransferencia: !linha.ehTransferencia,
                  contaTransferenciaId: null,
                })
              }
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-nano font-medium transition-colors",
                linha.ehTransferencia
                  ? "bg-brand text-white"
                  : "bg-muted text-ink-muted hover:bg-muted/70",
              )}
            >
              <ArrowLeftRight className="size-3" aria-hidden="true" />
              {linha.ehTransferencia ? "É uma transferência" : "Marcar como transferência"}
            </button>

            {linha.ehTransferencia ? (
              <div className="mt-1.5">
                <GatilhoSelecao
                  size="sm"
                  label={contas.find((c) => c.id === linha.contaTransferenciaId)?.nome ?? null}
                  placeholder={receita ? "De qual conta veio?" : "Para qual conta foi?"}
                  onClick={() => setModalAberto("contaTransferencia")}
                />
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setModalAberto("categoria")}
                  className={cn(
                    "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border bg-surface px-2 text-left text-nano outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    ESTILO_BORDA_SUGESTAO[linha.origemSugestao ?? "manual"],
                  )}
                >
                  <span className={cn("truncate", !categoriaSelecionada && "text-ink-muted")}>
                    {categoriaSelecionada?.nome ?? "Sem categoria"}
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => setModalAberto("contato")}
                  className={cn(
                    "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border bg-surface px-2 text-left text-nano outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    ESTILO_BORDA_SUGESTAO[linha.origemSugestao ?? "manual"],
                  )}
                >
                  <span className={cn("truncate", !contatoSelecionado && "text-ink-muted")}>
                    {contatoSelecionado?.nome ?? "Sem fornecedor/cliente"}
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
                </button>
              </div>
            )}

            {linha.origemSugestao && (
              <p
                className={cn(
                  "mt-1.5 text-nano",
                  linha.origemSugestao === "ia" ? "text-[#7c3aed]" : "text-positive-text",
                )}
              >
                {linha.origemSugestao === "ia"
                  ? "Categoria e fornecedor sugeridos pela IA"
                  : "Categoria e fornecedor repetidos de um lançamento parecido"}
              </p>
            )}
          </>
        )}
      </div>

      <SeletorCategoriaContatoModal
        tipo="categoria"
        aberto={modalAberto === "categoria"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        value={linha.categoriaId ?? SEM_CATEGORIA}
        onValueChange={(v) =>
          aoAtualizar(linha.id, { categoriaId: v === SEM_CATEGORIA ? null : v, origemSugestao: null })
        }
        opcoes={[
          { value: SEM_CATEGORIA, label: "Sem categoria" },
          ...categoriasDoTipo.map((c) => ({ value: c.id, label: c.nome })),
        ]}
        categorias={categorias}
        linhas={linhasDre}
        tipoEspaco={tipoEspaco}
        tipoPadrao={linha.tipo}
        aoCriar={aoCriarCategoria}
      />

      <SeletorCategoriaContatoModal
        tipo="contato"
        aberto={modalAberto === "contato"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        value={linha.contatoId ?? SEM_FORNECEDOR}
        onValueChange={(v) =>
          aoAtualizar(linha.id, { contatoId: v === SEM_FORNECEDOR ? null : v, origemSugestao: null })
        }
        opcoes={[
          { value: SEM_FORNECEDOR, label: "Sem fornecedor/cliente" },
          ...contatos.map((c) => ({ value: c.id, label: c.nome })),
        ]}
        aoCriar={aoCriarContato}
      />

      <SeletorListaModal
        aberto={modalAberto === "contaTransferencia"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo={receita ? "De qual conta veio?" : "Para qual conta foi?"}
        value={linha.contaTransferenciaId ?? SEM_CONTA}
        onValueChange={(v) =>
          aoAtualizar(linha.id, { contaTransferenciaId: v === SEM_CONTA ? null : v })
        }
        opcoes={[
          { value: SEM_CONTA, label: receita ? "De qual conta veio?" : "Para qual conta foi?" },
          ...contas.map((c) => ({ value: c.id, label: c.nome })),
        ]}
      />
    </div>
  );
}
