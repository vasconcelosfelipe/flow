"use client";

import { useEffect, useState } from "react";

/**
 * Atrasa a propagação de um valor até ele parar de mudar.
 *
 * Usado na busca de movimentações: o campo responde a cada tecla, mas a URL
 * (e portanto a consulta no servidor) só acompanha quando a pessoa para de
 * digitar.
 */
export function useDebouncedValue<T>(valor: T, atrasoMs = 250): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), atrasoMs);
    return () => clearTimeout(id);
  }, [valor, atrasoMs]);

  return atrasado;
}
