import type { Centavos } from "@/lib/money";
import type {
  FormaPagamento,
  StatusMovimentacao,
  TipoConta,
  TipoMovimentacao,
} from "@/types/dominio";

/**
 * Contrato entre a camada de dados e a interface.
 *
 * O protótipo (Fase 1) preenche estes tipos com dados fictícios; a Fase 2
 * preenche os mesmos tipos com Prisma. Nenhum componente muda entre as duas —
 * é isso que faz a validação visual não ser trabalho jogado fora.
 *
 * Regra: valores em centavos (inteiro), datas como `Date`, nada de Decimal ou
 * string numérica cruzando esta fronteira.
 */

export type CategoriaResumo = {
  id: string;
  nome: string;
  /** Chave do catálogo em `lib/icones`, não um caminho de SVG. */
  icone: string;
  cor: string;
};

export type ContaResumo = {
  id: string;
  nome: string;
  cor: string;
  tipo: TipoConta;
};

export type ContatoResumo = {
  id: string;
  nome: string;
};

/** Linha da lista. Só o que a linha desenha — o resto vem no detalhe. */
export type MovimentacaoResumo = {
  id: string;
  descricao: string;
  valorCentavos: Centavos;
  tipo: TipoMovimentacao;
  status: StatusMovimentacao;
  /** Data de caixa. `null` enquanto não foi pago. */
  data: Date | null;
  dataVencimento: Date | null;
  categoria: CategoriaResumo | null;
  conta: ContaResumo;
  contato: ContatoResumo | null;
  numeroParcela: number | null;
  totalParcelas: number | null;
  /** Veio de uma regra de recorrência, não de lançamento avulso. */
  recorrente: boolean;
};

export type MovimentacaoDetalhe = MovimentacaoResumo & {
  dataCompetencia: Date;
  descricaoOriginal: string | null;
  observacao: string | null;
  formaPagamento: FormaPagamento | null;
  centroCusto: { id: string; nome: string } | null;
  /** Origem da linha, para explicar de onde ela veio. */
  importacao: { id: string; nomeArquivo: string } | null;
};

/** Movimentações de um dia, já somadas — a lista agrupa por data. */
export type GrupoDiario = {
  chave: string;
  rotulo: string;
  totalCentavos: Centavos;
  itens: MovimentacaoResumo[];
};

export type FiltroMovimentacoes = {
  de?: Date;
  ate?: Date;
  contaId?: string;
  categoriaId?: string;
  tipo?: TipoMovimentacao;
  status?: StatusMovimentacao;
  busca?: string;
  /** Atalho para o trabalho de categorização em lote. */
  semCategoria?: boolean;
};

export type PaginaMovimentacoes = {
  grupos: GrupoDiario[];
  total: number;
  /** Cursor da próxima página; `null` quando acabou. */
  proximoCursor: string | null;
};
