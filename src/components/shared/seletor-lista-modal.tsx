"use client";

import { Check } from "lucide-react";

import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type OpcaoSeletorLista = { value: string; label: string; description?: string };

/**
 * Substitui todo `Select`/`SearchableSelect` dentro de modal — nenhum campo
 * de lista do produto abre popover/dropdown por cima do conteúdo (lê como
 * menu de contexto); todos abrem esta folha cheia com busca, igual o
 * seletor de categoria/fornecedor. Um único componente genérico pra Status,
 * Conta, Papel, Tipo etc. em vez de reimplementar a mesma lista em cada
 * formulário.
 */
export function SeletorListaModal({
  aberto,
  aoMudarAberto,
  titulo,
  value,
  onValueChange,
  opcoes,
  buscavel = true,
}: {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  titulo: string;
  value: string;
  onValueChange: (value: string) => void;
  opcoes: OpcaoSeletorLista[];
  /** Desliga o campo de busca em listas curtas (ex.: Status, Tipo) onde
   * digitar é mais atrito do que ajuda. */
  buscavel?: boolean;
}) {
  function selecionar(v: string) {
    onValueChange(v);
    aoMudarAberto(false);
  }

  return (
    <ResponsiveModal
      aberto={aberto}
      aoMudarAberto={aoMudarAberto}
      titulo={titulo}
      descricao="Toque numa opção da lista."
      rodape={
        <Button variant="outline" className="w-full" onClick={() => aoMudarAberto(false)}>
          Fechar
        </Button>
      }
    >
      <Command className="rounded-xl border border-line py-2">
        {buscavel && <CommandInput placeholder="Buscar…" />}
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup>
            {opcoes.map((o) => (
              <CommandItem key={o.value} value={o.label} onSelect={() => selecionar(o.value)}>
                <Check
                  className={cn("size-4", value === o.value ? "opacity-100" : "opacity-0")}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.description && (
                  <span className="ml-auto shrink-0 text-nano text-ink-muted">{o.description}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </ResponsiveModal>
  );
}
