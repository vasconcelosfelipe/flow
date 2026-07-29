/**
 * Contrato da tela de Centros de custo. Fase 1 guarda em memória sobre
 * `lib/mock`; Fase 2 é a tabela `CentroCusto` do Prisma, referenciada por
 * `movimentacao.centroCustoId`.
 */

export type CentroCustoCompleto = {
  id: string;
  nome: string;
  cor: string;
  quantidadeMovimentacoes: number;
};

export type FormularioCentroCusto = {
  id?: string;
  nome: string;
  cor: string;
};
