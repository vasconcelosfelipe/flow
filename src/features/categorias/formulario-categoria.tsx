"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICONES, iconeDe, type ChaveIcone } from "@/lib/icones";
import { cn } from "@/lib/utils";
import { DEFINICAO_LINHAS } from "@/services/dre/definicoes";
import type { CategoriaCompleta, FormularioCategoria } from "@/services/categorias/dto";
import type { TipoGrupoDre, TipoMovimentacao } from "@/types/dominio";

const SEM_LINHA = "nenhuma";

const GRUPOS_RECEITA: TipoGrupoDre[] = ["RECEITA", "RECEITA_FINANCEIRA"];

/** Só as contas de DRE compatíveis com o tipo entram na lista — uma
 * categoria de despesa não deveria poder somar em "Vendas". */
function linhasParaTipo(tipo: TipoMovimentacao) {
  return DEFINICAO_LINHAS.filter((def) =>
    tipo === "RECEITA" ? GRUPOS_RECEITA.includes(def.grupo) : !GRUPOS_RECEITA.includes(def.grupo),
  );
}

const PALETA_CORES = [
  "#10B981", "#059669", "#14B8A6", "#22C55E",
  "#EF4444", "#F97316", "#8B5CF6", "#F59E0B",
  "#EC4899", "#64748B", "#94A3B8", "#0EA5E9",
  "#6366F1", "#F43F5E",
];

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(40),
  tipo: z.enum(["RECEITA", "DESPESA"]),
  cor: z.string(),
  icone: z.string(),
  linhaDreId: z.string(),
});

/**
 * Um único formulário para criar e editar — a diferença entre os dois casos
 * é só ter ou não `categoria` de partida, nunca uma tela separada.
 */
export function FormularioCategoria({
  categoria,
  aoSalvar,
  aoExcluir,
  aoCancelar,
}: {
  categoria: CategoriaCompleta | null;
  aoSalvar: (dados: FormularioCategoria) => void;
  aoExcluir?: (id: string) => void;
  aoCancelar: () => void;
}) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: categoria?.nome ?? "",
      tipo: categoria?.tipo ?? "DESPESA",
      cor: categoria?.cor ?? PALETA_CORES[0],
      icone: categoria?.icone ?? "diversos",
      linhaDreId: categoria?.linhaDreId ?? SEM_LINHA,
    },
  });

  const tipo = watch("tipo");
  const cor = watch("cor");
  const icone = watch("icone") as ChaveIcone;
  const linhaDreId = watch("linhaDreId");
  const IconeSelecionado = iconeDe(icone);

  const linhasDisponiveis = useMemo(() => linhasParaTipo(tipo), [tipo]);

  // Trocar o tipo pode deixar a conta escolhida incompatível (uma linha de
  // Receita não existe mais depois de virar Despesa) — evita salvar um par
  // inconsistente sem a pessoa perceber.
  useEffect(() => {
    if (linhaDreId === SEM_LINHA) return;
    if (!linhasDisponiveis.some((l) => l.id === linhaDreId)) {
      setValue("linhaDreId", SEM_LINHA);
    }
  }, [linhasDisponiveis, linhaDreId, setValue]);

  function enviar(dados: z.infer<typeof schema>) {
    aoSalvar({
      id: categoria?.id,
      ...dados,
      icone: dados.icone as ChaveIcone,
      linhaDreId: dados.linhaDreId === SEM_LINHA ? null : dados.linhaDreId,
    });
  }

  const emUso = (categoria?.quantidadeMovimentacoes ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit(enviar)} className="space-y-5 py-2">
      <div className="flex items-center gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `${cor}1a`, color: cor }}
        >
          <IconeSelecionado className="size-5.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" {...register("nome")} placeholder="Ex.: Marketing" className="h-10" />
          {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["RECEITA", "DESPESA"] as TipoMovimentacao[]).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setValue("tipo", valor)}
              className={cn(
                "h-10 rounded-lg border text-micro font-medium transition-colors",
                tipo === valor
                  ? valor === "RECEITA"
                    ? "border-positive bg-positive-wash text-positive-text"
                    : "border-negative bg-negative-wash text-negative-text"
                  : "border-line text-ink-muted hover:bg-muted",
              )}
            >
              {valor === "RECEITA" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Conta na DRE</Label>
        <Select value={linhaDreId} onValueChange={(v) => setValue("linhaDreId", v)}>
          <SelectTrigger className="h-10 w-full rounded-lg border-line bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_LINHA}>Nenhuma — fora da DRE</SelectItem>
            {linhasDisponiveis.map((linha) => (
              <SelectItem key={linha.id} value={linha.id}>
                {linha.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-nano text-ink-muted">
          Define em qual linha do resultado esta categoria soma. Sem conta, os lançamentos ficam
          fora da DRE.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {PALETA_CORES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={cor === c}
              onClick={() => setValue("cor", c)}
              className={cn(
                "size-8 rounded-full ring-offset-2 transition-shadow",
                cor === c && "ring-2 ring-ink",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Ícone</Label>
        <div className="grid grid-cols-7 gap-1.5">
          {(Object.keys(ICONES) as ChaveIcone[]).map((chave) => {
            const Icone = ICONES[chave];
            const selecionado = icone === chave;
            return (
              <button
                key={chave}
                type="button"
                aria-label={chave}
                aria-pressed={selecionado}
                onClick={() => setValue("icone", chave)}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border transition-colors",
                  selecionado
                    ? "border-brand bg-brand-wash text-brand"
                    : "border-line text-ink-muted hover:bg-muted",
                )}
              >
                <Icone className="size-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {categoria && aoExcluir && (
        <div className="rounded-xl border border-line p-3">
          {emUso ? (
            <p className="text-micro text-ink-muted">
              Usada em {categoria.quantidadeMovimentacoes}{" "}
              {categoria.quantidadeMovimentacoes === 1 ? "movimentação" : "movimentações"} — não
              pode ser excluída enquanto estiver em uso.
            </p>
          ) : confirmandoExclusao ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-micro text-ink">Excluir esta categoria?</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmandoExclusao(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => aoExcluir(categoria.id)}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(true)}
              className="flex items-center gap-1.5 text-micro font-medium text-negative-text hover:underline"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Excluir categoria
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          Salvar
        </Button>
      </div>
    </form>
  );
}
