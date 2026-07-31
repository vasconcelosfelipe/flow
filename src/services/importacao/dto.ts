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
