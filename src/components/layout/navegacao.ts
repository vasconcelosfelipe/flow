import {
  ChartNoAxesCombined,
  Ellipsis,
  House,
  Tags,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type Destino = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Rotas filhas que também acendem este destino. */
  prefixo?: string[];
};

/**
 * Cinco destinos, definidos uma vez e consumidos pela barra inferior (celular)
 * e pelo rail lateral (desktop). Duas apresentações, uma verdade — a navegação
 * nunca diverge entre tamanhos de tela.
 */
export const DESTINOS: Destino[] = [
  { href: "/", rotulo: "Início", icone: House },
  {
    href: "/movimentacoes",
    rotulo: "Movimentações",
    icone: WalletCards,
    prefixo: ["/movimentacoes", "/importar", "/a-pagar-receber"],
  },
  { href: "/dre", rotulo: "DRE", icone: ChartNoAxesCombined },
  { href: "/categorias", rotulo: "Categorias", icone: Tags },
  { href: "/mais", rotulo: "Mais", icone: Ellipsis, prefixo: ["/mais"] },
];

export function destinoAtivo(pathname: string, destino: Destino): boolean {
  if (destino.href === "/") return pathname === "/";
  const alvos = destino.prefixo ?? [destino.href];
  return alvos.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
