import {
  Banknote,
  Briefcase,
  Building2,
  Bus,
  Car,
  CircleDollarSign,
  Coins,
  CreditCard,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  Handshake,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Megaphone,
  Package,
  Percent,
  PiggyBank,
  Plane,
  Receipt,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Truck,
  UtensilsCrossed,
  Users,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Catálogo fechado de ícones de categoria.
 *
 * Fechado de propósito: a categoria guarda no banco a chave (`"aluguel"`), não
 * um componente. Isso mantém o dado serializável, evita importar a biblioteca
 * inteira no cliente, e garante que o seletor de ícone da tela de categorias
 * ofereça exatamente o que o sistema sabe desenhar.
 */
export const ICONES = {
  vendas: ShoppingCart,
  loja: ShoppingBag,
  servicos: Handshake,
  clientes: Users,
  comissao: Percent,
  juros: PiggyBank,
  investimento: Coins,
  outrasReceitas: HandCoins,

  fornecedor: Truck,
  estoque: Package,
  aluguel: Home,
  folha: Briefcase,
  alimentacao: UtensilsCrossed,
  transporte: Bus,
  combustivel: Fuel,
  veiculo: Car,
  viagem: Plane,
  marketing: Megaphone,
  tecnologia: Laptop,
  telefonia: Smartphone,
  energia: Zap,
  manutencao: Wrench,
  saude: HeartPulse,
  educacao: GraduationCap,
  impostos: Landmark,
  taxas: Receipt,
  juridico: Scale,
  cartao: CreditCard,
  banco: Building2,
  brindes: Gift,
  diversos: Sparkles,

  carteira: Wallet,
  dinheiro: Banknote,
  generico: CircleDollarSign,
} satisfies Record<string, LucideIcon>;

export type ChaveIcone = keyof typeof ICONES;

/** Nunca lança: chave desconhecida cai num ícone neutro em vez de quebrar a tela. */
export function iconeDe(chave: string): LucideIcon {
  return ICONES[chave as ChaveIcone] ?? ICONES.generico;
}
