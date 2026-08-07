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
  /** Base sobre a qual as movimentações somam — não é o saldo atual. */
  saldoInicialCentavos: Centavos;
  saldoCentavos: Centavos;
  quantidadeMovimentacoes: number;
  /** Só fazem sentido quando `tipo === "CARTAO"`. */
  diaFechamento: number | null;
  diaVencimentoFatura: number | null;
};

export type FormularioConta = {
  id?: string;
  nome: string;
  cor: string;
  tipo: TipoConta;
  saldoInicialCentavos: Centavos;
  diaFechamento: number | null;
  diaVencimentoFatura: number | null;
};
