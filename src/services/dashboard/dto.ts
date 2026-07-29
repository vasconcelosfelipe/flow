import type { Centavos } from "@/lib/money";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

export type PontoSerie = {
  /** Rótulo já formatado para o eixo: "15 jul", "jul". */
  rotulo: string;
  receitasCentavos: Centavos;
  despesasCentavos: Centavos;
};

/**
 * Resultado acumulado desde o início do período.
 *
 * É o que a curva do card de resultado desenha. O valor diário sobe e desce a
 * cada lançamento e não conta história nenhuma; o acumulado mostra a
 * trajetória — se o mês está construindo lucro ou corroendo caixa.
 */
export type PontoAcumulado = {
  rotulo: string;
  acumuladoCentavos: Centavos;
};

export type SeveridadeAlerta = "atencao" | "critico" | "informativo";

export type Alerta = {
  id: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  /** Diz o que aconteceu e o que fazer. Nunca só "atenção". */
  descricao: string;
  acao: { rotulo: string; href: string };
};

export type BlocoPendencias = {
  totalCentavos: Centavos;
  quantidade: number;
  /** Quanto do total já passou do vencimento. */
  vencidoCentavos: Centavos;
};

export type ResumoDashboard = {
  saldoTotalCentavos: Centavos;
  /** Quantas contas compõem o saldo — some no rodapé do card. */
  quantidadeContas: number;
  receitasCentavos: Centavos;
  despesasCentavos: Centavos;
  /** Variação do resultado sobre o período anterior, em basis points. */
  variacaoResultado: number | null;
  aPagar: BlocoPendencias;
  aReceber: BlocoPendencias;
  serie: PontoSerie[];
  serieAcumulada: PontoAcumulado[];
  ultimasMovimentacoes: MovimentacaoResumo[];
  alertas: Alerta[];
};
