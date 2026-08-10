"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Landmark } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import type { Centavos } from "@/lib/money";

/**
 * O saldo é a primeira coisa que se procura ao abrir o app — por isso vive
 * nu sobre a zona escura, sem card branco ao redor. Um bloco de vidro
 * competiria com o card de resultado logo abaixo; texto direto sobre a marca
 * lê como informação de painel, não como mais uma caixa na pilha de caixas.
 *
 * O olho existe por um motivo prático: consultar saldo no ônibus, no balcão
 * da loja, com alguém ao lado. Esconder é um toque, e o estado não persiste
 * de propósito — a proteção some quando o app é reaberto.
 */
export function CartaoSaldo({
  centavos,
  quantidadeContas,
}: {
  centavos: Centavos;
  quantidadeContas: number;
}) {
  const [oculto, setOculto] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-nano font-semibold tracking-[0.14em] text-night-muted uppercase">
          Saldo em conta
        </p>

        <Link
          href="/mais/contas"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-night-muted transition-colors hover:bg-white/10 hover:text-night-text focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <Landmark className="size-4" aria-hidden="true" />
          <span className="sr-only">Ver contas</span>
        </Link>
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        {oculto ? (
          <span
            className="text-figure font-extrabold tracking-tight text-white sm:text-hero"
            aria-label="Saldo oculto"
          >
            ••••••
          </span>
        ) : (
          <AmountText
            centavos={centavos}
            tom="invertido"
            tamanho="hero"
            // ~20% maior que o "hero" padrão (usado também no card de
            // Resultado) — só o saldo precisa desse destaque extra, por
            // isso o ajuste é local, não uma mudança na escala inteira.
            className="text-[2.25rem] sm:text-[3.3rem]"
          />
        )}

        <button
          type="button"
          onClick={() => setOculto((atual) => !atual)}
          aria-pressed={oculto}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-night-muted transition-colors hover:bg-white/10 hover:text-night-text focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          {oculto ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
          <span className="sr-only">{oculto ? "Mostrar saldo" : "Ocultar saldo"}</span>
        </button>
      </div>

      <p className="mt-1 text-micro text-night-muted">
        Em {quantidadeContas} {quantidadeContas === 1 ? "conta" : "contas"}
      </p>
    </div>
  );
}
