"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { ICONES, iconeDe, type ChaveIcone } from "@/lib/icones";
import { cn } from "@/lib/utils";
import type { CategoriaCompleta, FormularioCategoria } from "@/services/categorias/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa, TipoMovimentacao } from "@/types/dominio";

export const FORM_ID_CATEGORIA = "form-categoria";

const SEM_LINHA = "nenhuma";
const SEM_PAI = "nenhuma";

function linhasParaTipo(linhas: LinhaDreOpcao[], tipo: TipoMovimentacao) {
  return linhas.filter((l) => l.tipoPermitido === null || l.tipoPermitido === tipo);
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
  categoriaPaiId: z.string(),
});

/**
 * Um único formulário para criar e editar — a diferença entre os dois casos
 * é só ter ou não `categoria` de partida, nunca uma tela separada.
 */
export function FormularioCategoria({
  categoria,
  categorias,
  linhas,
  tipoEspaco,
  tipoPadrao,
  aoSalvar,
  aoExcluir,
}: {
  categoria: CategoriaCompleta | null;
  categorias: CategoriaCompleta[];
  linhas: LinhaDreOpcao[];
  /** Espaço pessoa física não usa DRE — some o campo de linha, não a tela inteira. */
  tipoEspaco: TipoEmpresa;
  /** Só pra categoria nova: pré-seleciona Receita/Despesa herdando do
   * lançamento que disparou o "+ Nova categoria" (ex.: criando uma receita
   * em Nova movimentação, a categoria já nasce Receita, não Despesa). */
  tipoPadrao?: TipoMovimentacao;
  aoSalvar: (dados: FormularioCategoria) => void;
  aoExcluir?: (id: string) => void;
}) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [modalAberto, setModalAberto] = useState<"categoriaPai" | "linhaDre" | null>(null);

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
      tipo: categoria?.tipo ?? tipoPadrao ?? "DESPESA",
      cor: categoria?.cor ?? PALETA_CORES[0],
      icone: categoria?.icone ?? "diversos",
      linhaDreId: categoria?.linhaDreId ?? SEM_LINHA,
      categoriaPaiId: categoria?.categoriaPaiId ?? SEM_PAI,
    },
  });

  const tipo = watch("tipo");
  const cor = watch("cor");
  const icone = watch("icone") as ChaveIcone;
  const linhaDreId = watch("linhaDreId");
  const categoriaPaiId = watch("categoriaPaiId");
  const IconeSelecionado = iconeDe(icone);

  const linhasDisponiveis = useMemo(() => linhasParaTipo(linhas, tipo), [linhas, tipo]);

  // Só categorias de topo (sem pai) do mesmo tipo, e nunca a própria categoria
  // em edição — evita ciclo e limita a hierarquia a um único nível.
  const paisDisponiveis = useMemo(
    () =>
      categorias.filter(
        (c) => c.tipo === tipo && c.categoriaPaiId === null && c.id !== categoria?.id,
      ),
    [categorias, tipo, categoria?.id],
  );

  const paiSelecionado = useMemo(
    () => (categoriaPaiId === SEM_PAI ? null : (categorias.find((c) => c.id === categoriaPaiId) ?? null)),
    [categorias, categoriaPaiId],
  );

  useEffect(() => {
    if (linhaDreId === SEM_LINHA) return;
    if (!linhasDisponiveis.some((l) => l.id === linhaDreId)) {
      setValue("linhaDreId", SEM_LINHA);
    }
  }, [linhasDisponiveis, linhaDreId, setValue]);

  useEffect(() => {
    if (categoriaPaiId === SEM_PAI) return;
    if (!paisDisponiveis.some((c) => c.id === categoriaPaiId)) {
      setValue("categoriaPaiId", SEM_PAI);
    }
  }, [paisDisponiveis, categoriaPaiId, setValue]);

  // Subcategoria nunca escolhe linha, ícone ou cor próprios — herda os três
  // da mãe, sempre. Faz a DRE somar as duas na mesma linha, aninhar a
  // subcategoria por baixo, e a lista de categorias ler como uma família só.
  useEffect(() => {
    if (!paiSelecionado) return;
    setValue("linhaDreId", paiSelecionado.linhaDreId ?? SEM_LINHA);
    setValue("icone", paiSelecionado.icone);
    setValue("cor", paiSelecionado.cor);
  }, [paiSelecionado, setValue]);

  function enviar(dados: z.infer<typeof schema>) {
    aoSalvar({
      id: categoria?.id,
      ...dados,
      icone: dados.icone as ChaveIcone,
      linhaDreId: dados.linhaDreId === SEM_LINHA ? null : dados.linhaDreId,
      categoriaPaiId: dados.categoriaPaiId === SEM_PAI ? null : dados.categoriaPaiId,
    });
  }

  const emUso = (categoria?.quantidadeMovimentacoes ?? 0) > 0;

  return (
    <form id={FORM_ID_CATEGORIA} onSubmit={handleSubmit(enviar)} className="space-y-5 py-2">
      <div className="flex items-center gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `${cor}1a`, color: cor }}
        >
          <IconeSelecionado className="size-5.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" {...register("nome")} placeholder="Ex.: Marketing" className="h-11" />
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
                "h-11 rounded-lg border text-micro font-medium transition-colors",
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
        <Label>Categoria pai</Label>
        <GatilhoSelecao
          label={paiSelecionado?.nome ?? null}
          placeholder="Nenhuma — categoria principal"
          onClick={() => setModalAberto("categoriaPai")}
        />
        <p className="text-nano text-ink-muted">
          Escolha uma categoria principal pra tornar esta uma subcategoria dela.
        </p>
      </div>

      {tipoEspaco !== "PESSOA_FISICA" && (
        <div className="space-y-1.5">
          <Label>Linha da DRE</Label>
          {paiSelecionado ? (
            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-muted px-3 text-corpo text-ink-muted">
              {linhasDisponiveis.find((l) => l.id === paiSelecionado.linhaDreId)?.nome ??
                "Nenhuma — fora da DRE"}
            </div>
          ) : (
            <GatilhoSelecao
              label={linhasDisponiveis.find((l) => l.id === linhaDreId)?.nome ?? null}
              placeholder="Nenhuma — fora da DRE"
              onClick={() => setModalAberto("linhaDre")}
            />
          )}
          <p className="text-nano text-ink-muted">
            {paiSelecionado
              ? `Herdada de "${paiSelecionado.nome}" — mude na categoria mãe pra afetar todas as subcategorias.`
              : "Define em qual linha da DRE esta categoria soma. Sem linha, os lançamentos ficam fora do relatório."}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Cor</Label>
        {paiSelecionado ? (
          <p className="text-nano text-ink-muted">
            Subcategoria usa a mesma cor de &quot;{paiSelecionado.nome}&quot; — sem escolha
            própria, pra família de categorias ficar visualmente óbvia na lista.
          </p>
        ) : (
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
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Ícone</Label>
        {paiSelecionado ? (
          <p className="text-nano text-ink-muted">
            Subcategoria usa o mesmo ícone de &quot;{paiSelecionado.nome}&quot; — sem escolha
            própria, pra família de categorias ficar visualmente óbvia na lista.
          </p>
        ) : (
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
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
                    "grid size-10 shrink-0 place-items-center rounded-lg border transition-colors",
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
        )}
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

      <SeletorListaModal
        aberto={modalAberto === "categoriaPai"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Categoria pai"
        value={categoriaPaiId}
        onValueChange={(v) => setValue("categoriaPaiId", v)}
        opcoes={[
          { value: SEM_PAI, label: "Nenhuma — categoria principal" },
          ...paisDisponiveis.map((c) => ({ value: c.id, label: c.nome })),
        ]}
      />

      <SeletorListaModal
        aberto={modalAberto === "linhaDre"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Linha da DRE"
        value={linhaDreId}
        onValueChange={(v) => setValue("linhaDreId", v)}
        opcoes={[
          { value: SEM_LINHA, label: "Nenhuma — fora da DRE" },
          ...linhasDisponiveis.map((l) => ({ value: l.id, label: l.nome })),
        ]}
      />
    </form>
  );
}
