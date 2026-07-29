import { Banknote, Building2, CreditCard, PiggyBank, TrendingUp, type LucideIcon } from "lucide-react";

import type { TipoConta } from "@/types/dominio";

/** Um ícone por tipo de conta — fechado, como o catálogo de categorias. */
const ICONES_CONTA: Record<TipoConta, LucideIcon> = {
  CORRENTE: Building2,
  POUPANCA: PiggyBank,
  CAIXA: Banknote,
  CARTAO: CreditCard,
  INVESTIMENTO: TrendingUp,
};

export function iconeDeConta(tipo: TipoConta): LucideIcon {
  return ICONES_CONTA[tipo];
}
