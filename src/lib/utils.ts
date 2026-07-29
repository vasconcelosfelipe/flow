import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Escala tipográfica própria (ver `globals.css`).
 *
 * Precisa ser declarada aqui porque o `tailwind-merge` só conhece os nomes
 * padrão do Tailwind. Sem isto ele lê `text-figure` como cor de texto, entende
 * que conflita com `text-white` na mesma chamada e descarta o tamanho — o
 * resultado é toda a interface colapsando para 16px, sem hierarquia nenhuma.
 * O sintoma é silencioso: nenhum erro, só telas planas.
 */
const TAMANHOS_DE_TEXTO = ["nano", "micro", "corpo", "titulo", "figure", "hero"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TAMANHOS_DE_TEXTO }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
