"use client";

import { useEffect, useState } from "react";

/**
 * Consulta de media query reativa.
 *
 * Começa em `false` no servidor e no primeiro render do cliente, então quem
 * usa isto para escolher entre dois componentes deve assumir mobile como
 * padrão — é a escolha certa num app mobile first, e evita o salto de layout
 * que apareceria se assumíssemos desktop.
 */
export function useMediaQuery(query: string): boolean {
  const [corresponde, setCorresponde] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setCorresponde(media.matches);

    const aoMudar = (evento: MediaQueryListEvent) => setCorresponde(evento.matches);
    media.addEventListener("change", aoMudar);
    return () => media.removeEventListener("change", aoMudar);
  }, [query]);

  return corresponde;
}

/** Breakpoint único do app: abaixo disso é celular, acima é desktop. */
export function useDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
