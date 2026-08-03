import { cn } from "@/lib/utils";
import { formatarCompacto, formatarMoeda, formatarValor, type Centavos } from "@/lib/money";

type Tamanho = "sm" | "md" | "lg" | "hero";
type Tom = "auto" | "neutro" | "positivo" | "negativo" | "invertido" | "transferencia";

const TAMANHO: Record<Tamanho, string> = {
  sm: "text-micro",
  md: "text-corpo",
  lg: "text-titulo",
  hero: "text-figure sm:text-hero",
};

/**
 * Sem a mono para carregar peso técnico, o número precisa de mais gordura de
 * fonte para se separar do texto ao redor — por isso o herói sobe a 800, não
 * 600 como seria natural numa escala regular.
 */
const PESO: Record<Tamanho, string> = {
  sm: "font-semibold",
  md: "font-semibold",
  lg: "font-bold",
  hero: "font-extrabold",
};

/** Quanto maior o número, mais fechado o espacejamento. */
const TRACKING: Record<Tamanho, string> = {
  sm: "tracking-normal",
  md: "tracking-tight",
  lg: "tracking-tight",
  hero: "tracking-[-0.035em]",
};

export type AmountTextProps = {
  centavos: Centavos;
  /**
   * `auto` (padrão) colore pelo sinal do valor. Use `neutro` quando o número
   * for um saldo ou um total sem conotação de ganho ou perda — pintar tudo de
   * verde e vermelho tira o significado justamente de onde ele importa.
   */
  tom?: Tom;
  tamanho?: Tamanho;
  /** Mostra `+` explicitamente em valores positivos. */
  comSinal?: boolean;
  /** Omite "R$" — para tabelas cujo cabeçalho já declara a moeda. */
  semSimbolo?: boolean;
  /** `12,3 mil` em vez de `12.345,00`. Para as doze colunas da DRE anual. */
  compacto?: boolean;
  className?: string;
};

/**
 * Todo valor monetário do Flow passa por aqui.
 *
 * Fixa três coisas que, soltas, sempre divergem entre telas: a fonte
 * monoespaçada (casas decimais alinham por construção), o tom por sinal, e o
 * texto acessível — um leitor de tela recebe "menos mil e duzentos reais",
 * não "R$ 1.200,00" com um traço perdido antes.
 */
export function AmountText({
  centavos,
  tom = "auto",
  tamanho = "md",
  comSinal = false,
  semSimbolo = false,
  compacto = false,
  className,
}: AmountTextProps) {
  const negativo = centavos < 0;

  // Tons de texto, não os da identidade: sobre branco, o verde da marca fica
  // em 2,54:1 e não se lê. Ver a nota em globals.css.
  const corAutomatica = negativo ? "text-negative-text" : "text-positive-text";
  const cor =
    tom === "auto"
      ? corAutomatica
      : tom === "positivo"
        ? "text-positive-text"
        : tom === "negativo"
          ? "text-negative-text"
          : tom === "invertido"
            ? "text-white"
            : tom === "transferencia"
              ? "text-brand"
              : "text-ink";

  // No tamanho herói o "R$" sai do fluxo do número: ele é unidade, não dígito,
  // e disputar peso com o valor é o que faz um saldo grande parecer pequeno.
  const simboloDestacado = tamanho === "hero" && !semSimbolo && !compacto;

  const formatador = compacto
    ? formatarCompacto
    : semSimbolo || simboloDestacado
      ? formatarValor
      : formatarMoeda;

  const texto = formatador(Math.abs(centavos));
  const prefixo = negativo ? "−" : comSinal ? "+" : "";

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 font-mono whitespace-nowrap",
        TAMANHO[tamanho],
        PESO[tamanho],
        TRACKING[tamanho],
        cor,
        className,
      )}
      // O sinal tipográfico (−, U+2212) alinha melhor que o hífen, mas não é
      // lido de forma confiável: o texto acessível carrega o sinal por extenso.
      aria-label={`${negativo ? "menos " : ""}${formatarMoeda(Math.abs(centavos))}`}
    >
      {simboloDestacado && (
        <span aria-hidden="true" className="text-[0.42em] font-medium opacity-55">
          R$
        </span>
      )}
      <span aria-hidden="true">
        {prefixo}
        {texto}
      </span>
    </span>
  );
}
