import {
  ChartNoAxesCombined,
  House,
  Settings2,
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
 * Quatro destinos reais, definidos uma vez e consumidos pela barra inferior
 * (celular) e pelo rail lateral (desktop). Duas apresentações, uma verdade —
 * a navegação nunca diverge entre tamanhos de tela.
 *
 * O "+" de novo lançamento fica FORA desta lista — é um botão de ação (abre
 * o modal global via `useNovoLancamento`), não uma rota, e é renderizado à
 * parte na posição central por `BottomNav`/`DesktopRail`.
 */
export const DESTINOS: Destino[] = [
  { href: "/", rotulo: "Início", icone: House },
  {
    href: "/movimentacoes",
    rotulo: "Movimentações",
    icone: WalletCards,
    prefixo: ["/movimentacoes", "/importar"],
  },
  { href: "/dre", rotulo: "DRE", icone: ChartNoAxesCombined },
  { href: "/mais", rotulo: "Ajustes", icone: Settings2, prefixo: ["/mais"] },
];

export function destinoAtivo(pathname: string, destino: Destino): boolean {
  if (destino.href === "/") return pathname === "/";
  const alvos = destino.prefixo ?? [destino.href];
  return alvos.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
