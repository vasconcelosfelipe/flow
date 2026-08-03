"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";

type OpcaoFiltro = { id: string; nome: string };

export function FiltrosMovimentacoes({
  contas = [],
  categorias: categoriasIniciais = [],
  linhas = [],
}: {
  contas?: OpcaoFiltro[];
  categorias?: CategoriaCompleta[];
  linhas?: LinhaDreOpcao[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, iniciarTransicao] = useTransition();

  const [busca, setBusca] = useState(params.get("busca") ?? "");
  const buscaAtrasada = useDebouncedValue(busca, 250);
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaModalAberto, setCategoriaModalAberto] = useState(false);
  const [categorias, setCategorias] = useState(categoriasIniciais);

  useEffect(() => {
    aplicar({ busca: buscaAtrasada || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAtrasada]);

  function aplicar(mudancas: Record<string, string | null>) {
    const proximos = new URLSearchParams(params.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null || valor === "todos") proximos.delete(chave);
      else proximos.set(chave, valor);
    }
    iniciarTransicao(() => {
      router.replace(`${pathname}?${proximos.toString()}`, { scroll: false });
    });
  }

  const filtrosAtivos = ["conta", "categoria", "tipo", "status", "semCategoria"].filter((c) =>
    params.get(c),
  ).length;

  function limparFiltros() {
    aplicar({
      conta: null,
      categoria: null,
      tipo: null,
      status: null,
      semCategoria: null,
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição…"
            className={cn(
              "h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-corpo text-ink placeholder:text-ink-muted",
              "focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
            )}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-muted"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Limpar busca</span>
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="relative h-11 w-11 shrink-0 rounded-xl border-line"
          aria-label="Filtros"
          onClick={() => setModalAberto(true)}
        >
          <SlidersHorizontal className="size-4" />
          {filtrosAtivos > 0 && (
            <span className="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {filtrosAtivos}
            </span>
          )}
        </Button>
      </div>

      <ResponsiveModal
        aberto={modalAberto}
        aoMudarAberto={setModalAberto}
        titulo="Filtros"
        descricao="Filtre as movimentações por tipo, conta, categoria e status."
        rodape={
          <>
            <Button variant="outline" className="flex-1" onClick={limparFiltros}>
              Limpar filtros
            </Button>
            <Button className="flex-1" onClick={() => setModalAberto(false)}>
              Concluído
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={params.get("tipo") ?? "todos"}
              onValueChange={(v) => aplicar({ tipo: v })}
            >
              <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="RECEITA">Receitas</SelectItem>
                <SelectItem value="DESPESA">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Conta</Label>
            <SearchableSelect
              value={params.get("conta") ?? "todos"}
              onValueChange={(v) => aplicar({ conta: v })}
              placeholder="Todas as contas"
              searchPlaceholder="Buscar conta…"
              emptyText="Nenhuma conta encontrada."
              options={[
                { value: "todos", label: "Todas as contas" },
                ...contas.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <GatilhoSelecao
              label={categorias.find((c) => c.id === params.get("categoria"))?.nome ?? null}
              placeholder="Todas as categorias"
              onClick={() => setCategoriaModalAberto(true)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={params.get("status") ?? "todos"}
              onValueChange={(v) => aplicar({ status: v })}
            >
              <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="CONCILIADO">Conciliado</SelectItem>
                <SelectItem value="CANCELADO">Excluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ResponsiveModal>

      {categoriaModalAberto && (
        <SeletorCategoriaContatoModal
          tipo="categoria"
          aberto
          aoMudarAberto={setCategoriaModalAberto}
          value={params.get("categoria") ?? "todos"}
          onValueChange={(v) => aplicar({ categoria: v })}
          opcoes={[
            { value: "todos", label: "Todas as categorias" },
            ...categorias.map((c) => ({ value: c.id, label: c.nome })),
          ]}
          categorias={categorias}
          linhas={linhas}
          aoCriar={(categoria) => setCategorias((atual) => [...atual, categoria])}
        />
      )}
    </div>
  );
}
