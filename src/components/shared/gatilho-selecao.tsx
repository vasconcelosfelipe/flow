"use client";

import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botão que abre `SeletorListaModal`/`SeletorCategoriaContatoModal` — todo
 * campo de lista do produto usa este gatilho + uma folha cheia com busca,
 * nunca um `Select`/popover ancorado (lê como menu de contexto).
 */
export function GatilhoSelecao({
  label,
  placeholder,
  onClick,
  size = "default",
  disabled = false,
  className,
}: {
  label: string | null;
  placeholder: string;
  onClick: () => void;
  size?: "default" | "sm";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60",
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
