import { cn } from "@/lib/utils";

/**
 * A marca: três traços de larguras diferentes, deslocados, com pontas
 * arredondadas — entrada, saída e resultado. É a mesma leitura da barra do
 * Painel Resultado, reduzida a um símbolo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="url(#flow-brand)" />
      <rect x="6" y="9.5" width="20" height="3.5" rx="1.75" fill="white" />
      <rect x="6" y="14.25" width="13.75" height="3.5" rx="1.75" fill="white" fillOpacity="0.75" />
      <rect x="6" y="19" width="8" height="3.5" rx="1.75" fill="white" fillOpacity="0.5" />
      <defs>
        <linearGradient id="flow-brand" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  tema = "claro",
  disposicao = "linha",
}: {
  className?: string;
  /** `escuro` para uso sobre a zona de comando ou telas de acesso. */
  tema?: "claro" | "escuro";
  /** `empilhada` põe a marca acima do nome — usada na splash de abertura. */
  disposicao?: "linha" | "empilhada";
}) {
  return (
    <span
      className={cn(
        "flex items-center",
        disposicao === "linha" ? "gap-2" : "flex-col gap-3",
        className,
      )}
    >
      <LogoMark className={disposicao === "empilhada" ? "size-14" : undefined} />
      <span
        className={cn(
          "font-logo font-bold tracking-[-0.02em]",
          disposicao === "linha" ? "text-xl" : "text-4xl",
          tema === "escuro" ? "text-night-text" : "text-ink",
        )}
      >
        flow
      </span>
    </span>
  );
}
