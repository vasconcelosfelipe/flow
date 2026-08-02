"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type OpcaoBusca = {
  value: string;
  label: string;
  /** Texto pequeno à direita — ex.: rótulo de subcategoria "em Marketing". */
  description?: string;
};

/**
 * Select com busca — mesma pegada visual do `Select` do shadcn (altura,
 * borda, raio), mas abre um `Command` com campo de texto em vez de uma lista
 * simples. Existe porque listas de cadastro (categoria, fornecedor) crescem
 * e rolar por dezenas de itens pra achar um é pior do que digitar três
 * letras — troque por este sempre que a lista puder passar de ~15 itens.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecionar…",
  searchPlaceholder = "Buscar…",
  emptyText = "Nada encontrado.",
  size = "default",
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: OpcaoBusca[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionada = options.find((o) => o.value === value);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={aberto}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand",
            size === "sm" ? "h-8 text-nano" : "h-11 text-corpo",
            !selecionada && "text-ink-muted",
            className,
          )}
        >
          <span className="truncate">{selecionada?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opcao) => (
                <CommandItem
                  key={opcao.value}
                  value={opcao.label}
                  onSelect={() => {
                    onValueChange(opcao.value);
                    setAberto(false);
                  }}
                >
                  <Check
                    className={cn("size-4", value === opcao.value ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{opcao.label}</span>
                  {opcao.description && (
                    <span className="ml-auto shrink-0 text-nano text-ink-muted">
                      {opcao.description}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
