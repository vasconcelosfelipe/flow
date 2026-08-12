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

export type StatusLinhaImportacao = "NOVA" | "DUPLICADA" | "CONCILIAVEL" | "IGNORADA";

/**
 * Uma fatia de uma linha do extrato dividida em vários lançamentos — ver
 * `LinhaImportacao.divisao`.
 */
export type ParteDivisao = {
  /** Gerado no cliente (`crypto.randomUUID()`), só pra `key` de lista/edição. */
  id: string;
  valorCentavos: Centavos;
  descricao: string;
  categoriaId: string | null;
  contatoId: string | null;
  /** Preenchido = esta parte fecha a pendência com este id, em vez de criar
   * lançamento novo. Quando preenchido, valor/descrição/categoria/contato
   * vêm travados nos dados da pendência (ver `SeletorDivisaoModal`). */
  fechaPendenciaId: string | null;
};

export type LinhaImportacao = {
  /** FITID do OFX — também a chave de dedup gravada em `origemFitId`. */
  id: string;
  descricao: string;
  /**
   * Texto exatamente como veio do extrato, nunca editado — a pessoa pode
   * reescrever `descricao` livremente na revisão, mas a conciliação de
   * importações futuras precisa comparar contra o texto original do banco,
   * senão um "PIX RECEBIDO — JOAO 04/03" renomeado pra "Aluguel" para de
   * casar com a próxima ocorrência do mesmo PIX.
   */
  descricaoOriginal: string;
  data: Date;
  valorCentavos: Centavos;
  tipo: TipoMovimentacao;
  status: StatusLinhaImportacao;
  categoriaSugerida: CategoriaResumo | null;
  /** Só em `CONCILIAVEL`: o compromisso em aberto que esta linha resolve. */
  conciliaCom: MovimentacaoResumo | null;
  /** Seleção de importação. Duplicadas e ignoradas nascem desmarcadas. */
  incluir: boolean;
  /**
   * Marcada nesta revisão pra nunca mais ser sugerida: não vira lançamento
   * nenhum, só grava a chave de dedup (`ImportacaoLinha.contaId`+`fitId`) —
   * é o que faz o status virar `IGNORADA` se o mesmo arquivo for reimportado.
   */
  ignorarPermanentemente: boolean;
  /**
   * Categoria e fornecedor escolhidos na revisão, antes de confirmar.
   * Em linhas `CONCILIAVEL` nascem pré-preenchidos com o que já está na
   * pendência que a linha fecha — a pessoa só ajusta se quiser.
   */
  categoriaId: string | null;
  contatoId: string | null;
  /**
   * De onde veio o preenchimento automático de categoria/fornecedor — só
   * enquanto a pessoa não mexer neles na revisão (editar manualmente limpa
   * isso). `null` em linha `CONCILIAVEL` (vem da pendência, não é uma
   * "sugestão") e em linha que ninguém conseguiu sugerir nada.
   */
  origemSugestao: "ia" | "trigrama" | null;
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
  /**
   * Não-nulo = a pessoa dividiu esta linha em N partes (um pagamento único
   * cobrindo várias despesas) — cada parte vira seu próprio lançamento ou
   * fecha uma pendência, todas ligadas por `Movimentacao.divisaoId` na
   * confirmação. `null` = comportamento normal, sem divisão.
   */
  divisao: ParteDivisao[] | null;
};

export type ResumoImportacao = {
  arquivoNome: string;
  conta: ContaResumo;
  linhas: LinhaImportacao[];
  /** Pendências em aberto da mesma conta — candidatas a "fechar pendência
   * existente" dentro do editor de divisão de uma linha. */
  pendenciasAbertas: MovimentacaoResumo[];
};

export type ResultadoConfirmacao = {
  criadas: number;
  conciliadas: number;
  ignoradas: number;
};
