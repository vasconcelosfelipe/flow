import type { Centavos } from "@/lib/money";
import type { TipoConta } from "@/types/dominio";

/**
 * Contrato da tela de Contas. Fase 1 soma sobre `lib/mock`; Fase 2 é a
 * própria tabela `Conta` do Prisma com o saldo vindo de uma view agregada,
 * não recalculado a cada leitura.
 */

export type ContaCompleta = {
  id: string;
  nome: string;
  cor: string;
  tipo: TipoConta;
  saldoCentavos: Centavos;
  quantidadeMovimentacoes: number;
};

export type FormularioConta = {
  id?: string;
  nome: string;
  cor: string;
  tipo: TipoConta;
};
