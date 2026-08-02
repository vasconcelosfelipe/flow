"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode, type TouchEvent } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const LIMIAR = 70;
const PUXAO_MAXIMO = 110;
/** Resistência: puxar 2px de dedo desloca só 1px de conteúdo — sem isso o
 * gesto parece "solto demais" e alcança o limiar rápido demais. */
const RESISTENCIA = 0.5;

/**
 * Puxar-para-atualizar global do app.
 *
 * Existe porque o produto roda como PWA instalado (`display: standalone`) —
 * nesse modo não há chrome do navegador pra oferecer o gesto nativo, e
 * `overscroll-behavior-y: none` (globals.css) já desliga o bounce nativo do
 * iOS/Android de qualquer forma. Sem isto, a única forma de atualizar uma
 * tela é sair e voltar.
 *
 * Detecta o puxão pela posição do dedo, não pelo scroll do documento: só
 * arma quando `window.scrollY` já está em 0, senão um "puxão" no meio de uma
 * lista rolável dispararia atualização por engano.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [distancia, setDistancia] = useState(0);
  const inicioY = useRef<number | null>(null);
  const puxando = useRef(false);

  function aoTocar(e: TouchEvent) {
    if (pending || window.scrollY > 0) {
      inicioY.current = null;
      return;
    }
    inicioY.current = e.touches[0].clientY;
    puxando.current = true;
  }

  function aoMover(e: TouchEvent) {
    if (!puxando.current || inicioY.current === null || pending) return;
    if (window.scrollY > 0) {
      puxando.current = false;
      setDistancia(0);
      return;
    }
    const bruto = e.touches[0].clientY - inicioY.current;
    if (bruto <= 0) {
      setDistancia(0);
      return;
    }
    setDistancia(Math.min(PUXAO_MAXIMO, bruto * RESISTENCIA));
  }

  function aoSoltar() {
    if (!puxando.current) return;
    puxando.current = false;
    if (distancia >= LIMIAR) {
      setDistancia(LIMIAR);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setDistancia(0);
    }
  }

  // A transição terminou (`router.refresh()` já repintou) — recolhe o
  // indicador. Só dispara na borda true→false, nunca durante o arrasto.
  useEffect(() => {
    if (!pending) setDistancia(0);
  }, [pending]);

  const progresso = Math.min(1, distancia / LIMIAR);
  const deslocamento = pending ? LIMIAR : distancia;

  return (
    <div onTouchStart={aoTocar} onTouchMove={aoMover} onTouchEnd={aoSoltar} onTouchCancel={aoSoltar}>
      <div
        className="relative"
        style={{
          transform: deslocamento ? `translateY(${deslocamento}px)` : undefined,
          transition: puxando.current ? undefined : "transform 200ms ease-out",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-[-2.75rem] flex h-11 items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="grid size-9 place-items-center rounded-full bg-surface text-brand shadow-raised"
            style={{ opacity: deslocamento > 4 ? 1 : 0 }}
          >
            <Loader2
              className={cn("size-4.5", pending && "animate-spin")}
              style={!pending ? { transform: `rotate(${progresso * 360}deg)` } : undefined}
            />
          </span>
        </div>

        {pending && (
          <span role="status" className="sr-only">
            Atualizando…
          </span>
        )}

        {children}
      </div>
    </div>
  );
}
