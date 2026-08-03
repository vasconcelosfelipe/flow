"use client";

import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botão que abre um `SeletorCategoriaContatoModal` (ou modal parecido) — a
 * mesma pegada visual do gatilho do `SearchableSelect`, só que abrindo uma
 * folha cheia em vez de um popover pequeno.
 */
export function GatilhoSelecao({
  label,
  placeholder,
  onClick,
  size = "default",
  className,
}: {
  label: string | null;
  placeholder: string;
  onClick: () => void;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand",
        size === "sm" ? "h-8 text-nano" : "h-11 text-corpo",
        !label && "text-ink-muted",
        className,
      )}
    >
      <span className="truncate">{label ?? placeholder}</span>
      <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </button>
  );
}
