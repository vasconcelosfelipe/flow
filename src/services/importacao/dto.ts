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
 * Fase 1 preenche `processarArquivo` com um cenário fixo que exercita os três
 * casos que a Fase 2 vai precisar resolver de verdade: linha nova, linha que
 * já existe (duplicada) e linha que casa com um compromisso em aberto
 * (conciliável). A tela de revisão não muda quando o parser de OFX real entrar.
 */

export type StatusLinhaImportacao = "NOVA" | "DUPLICADA" | "CONCILIAVEL";

export type LinhaImportacao = {
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
