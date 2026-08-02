"use client";

import { AlertCircle, GitMerge, Link2 } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatarData } from "@/lib/dates";
import { iconeDe } from "@/lib/icones";
import { cn } from "@/lib/utils";
import type { LinhaImportacao } from "@/services/importacao/dto";

type OpcaoCategoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };
type OpcaoContato = { id: string; nome: string };

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";

const ROTULO_STATUS = {
  NOVA: "Nova",
  DUPLICADA: "Já importada",
  CONCILIAVEL: "Concilia",
} as const;

const ESTILO_STATUS = {
  NOVA: "bg-brand-wash text-brand",
  DUPLICADA: "bg-muted text-ink-muted",
  CONCILIAVEL: "bg-positive-wash text-positive-text",
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
  categorias,
  contatos,
  aoAlternar,
  aoAtualizar,
}: {
  linha: LinhaImportacao;
  categorias: OpcaoCategoria[];
  contatos: OpcaoContato[];
  aoAlternar: (id: string) => void;
  aoAtualizar: (id: string, ajuste: { categoriaId?: string | null; contatoId?: string | null }) => void;
}) {
  const receita = linha.tipo === "RECEITA";
  const Icone = linha.categoriaSugerida ? iconeDe(linha.categoriaSugerida.icone) : AlertCircle;
  const categoriasDoTipo = categorias.filter((c) => c.tipo === linha.tipo);

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

      <span
        className={cn(
          "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
          linha.categoriaSugerida
            ? undefined
            : "bg-attention-wash text-attention",
        )}
        style={
          linha.categoriaSugerida
            ? { backgroundColor: `${linha.categoriaSugerida.cor}1a`, color: linha.categoriaSugerida.cor }
            : undefined
        }
      >
        <Icone className="size-4.5" aria-hidden="true" />
      </span>

      <div className={cn("min-w-0 flex-1", !linha.incluir && "opacity-60")}>
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-corpo font-medium text-ink">{linha.descricao}</span>
          <AmountText
            centavos={receita ? linha.valorCentavos : -linha.valorCentavos}
            tamanho="sm"
            className="shrink-0"
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

        {linha.incluir && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <SearchableSelect
              size="sm"
              value={linha.categoriaId ?? SEM_CATEGORIA}
              onValueChange={(v) =>
                aoAtualizar(linha.id, { categoriaId: v === SEM_CATEGORIA ? null : v })
              }
              placeholder="Categoria"
              searchPlaceholder="Buscar categoria…"
              emptyText="Nenhuma categoria encontrada."
              options={[
                { value: SEM_CATEGORIA, label: "Sem categoria" },
                ...categoriasDoTipo.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />

            <SearchableSelect
              size="sm"
              value={linha.contatoId ?? SEM_FORNECEDOR}
              onValueChange={(v) =>
                aoAtualizar(linha.id, { contatoId: v === SEM_FORNECEDOR ? null : v })
              }
              placeholder="Fornecedor/cliente"
              searchPlaceholder="Buscar fornecedor/cliente…"
              emptyText="Nenhum fornecedor/cliente encontrado."
              options={[
                { value: SEM_FORNECEDOR, label: "Sem fornecedor/cliente" },
                ...contatos.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
