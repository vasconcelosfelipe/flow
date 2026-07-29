"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

type OpcaoFiltro = { id: string; nome: string };

export function FiltrosMovimentacoes({
  contas = [],
  categorias = [],
}: {
  contas?: OpcaoFiltro[];
  categorias?: OpcaoFiltro[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, iniciarTransicao] = useTransition();

  const [busca, setBusca] = useState(params.get("busca") ?? "");
  const buscaAtrasada = useDebouncedValue(busca, 250);

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
        >
          <SlidersHorizontal className="size-4" />
          {filtrosAtivos > 0 && (
            <span className="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {filtrosAtivos}
            </span>
          )}
        </Button>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        <Select
          value={params.get("tipo") ?? "todos"}
          onValueChange={(v) => aplicar({ tipo: v })}
        >
          <SelectTrigger className="h-9 w-auto shrink-0 rounded-lg border-line bg-surface text-micro">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="RECEITA">Receitas</SelectItem>
            <SelectItem value="DESPESA">Despesas</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={params.get("conta") ?? "todos"}
          onValueChange={(v) => aplicar({ conta: v })}
        >
          <SelectTrigger className="h-9 w-auto shrink-0 rounded-lg border-line bg-surface text-micro">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as contas</SelectItem>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.get("categoria") ?? "todos"}
          onValueChange={(v) => aplicar({ categoria: v })}
        >
          <SelectTrigger className="h-9 w-auto shrink-0 rounded-lg border-line bg-surface text-micro">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
