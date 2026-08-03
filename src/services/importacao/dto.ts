import type { Centavos } from "@/lib/money";
import type {
  CategoriaResumo,
  ContaResumo,
  MovimentacaoResumo,
} from "@/services/movimentacoes/dto";
import type { TipoMovimentacao } from "@/types/dominio";

/**
 * Contrato do fluxo de importação: arquivo → revisão → confirmação.
 *
 * `id` de cada linha é o FITID do OFX — o mesmo identificador usado como
 * chave de deduplicação no banco (`Movimentacao.origemFitId`). A revisão
 * nunca inventa um id próprio porque é esse valor que decide, na confirmação,
 * se a linha vira lançamento novo ou fecha uma pendência existente.
 */

export type StatusLinhaImportacao = "NOVA" | "DUPLICADA" | "CONCILIAVEL";

export type LinhaImportacao = {
  /** FITID do OFX — também a chave de dedup gravada em `origemFitId`. */
  id: string;
  descricao: string;
  data: Date;
  valorCentavos: Centavos;
  tipo: TipoMovimentacao;
  status: StatusLinhaImportacao;
  categoriaSugerida: CategoriaResumo | null;
  /** Só em `CONCILIAVEL`: o compromisso em aberto que esta linha resolve. */
  conciliaCom: MovimentacaoResumo | null;
  /** Seleção de importação. Duplicadas nascem desmarcadas. */
  incluir: boolean;
  /**
   * Categoria e fornecedor escolhidos na revisão, antes de confirmar.
   * Em linhas `CONCILIAVEL` nascem pré-preenchidos com o que já está na
   * pendência que a linha fecha — a pessoa só ajusta se quiser.
   */
  categoriaId: string | null;
  contatoId: string | null;
  /**
   * Um crédito ou débito do extrato às vezes é dinheiro migrando entre
   * contas da própria empresa, não receita/despesa de verdade. Marcando,
   * a linha vira as duas pernas de uma transferência (ver
   * `Movimentacao.transferenciaId`) em vez de um lançamento comum — a
   * conta escolhida aqui é sempre "o outro lado", nunca a conta do extrato
   * que está sendo importado.
   */
  ehTransferencia: boolean;
  contaTransferenciaId: string | null;
};

export type ResumoImportacao = {
  arquivoNome: string;
  conta: ContaResumo;
  linhas: LinhaImportacao[];
};

export type ResultadoConfirmacao = {
  criadas: number;
  conciliadas: number;
};
