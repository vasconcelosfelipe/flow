import type { TipoContato } from "@/types/dominio";

/**
 * Contrato da tela de Contatos. Fase 1 guarda em memória sobre `lib/mock`;
 * Fase 2 é a tabela `Contato` do Prisma, referenciada por `movimentacao.contatoId`.
 */

export type ContatoCompleto = {
  id: string;
  nome: string;
  tipo: TipoContato;
  /** CPF ou CNPJ, já formatado. `null` quando não informado. */
  documento: string | null;
  quantidadeMovimentacoes: number;
};

export type FormularioContato = {
  id?: string;
  nome: string;
  documento: string | null;
};
