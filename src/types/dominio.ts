/**
 * Vocabulário do domínio financeiro.
 *
 * Espelha os enums do Prisma (§4 do plano). Definidos aqui como união de
 * literais para que o protótipo e os componentes não dependam do cliente do
 * banco — quando a Fase 2 gerar os tipos do Prisma, eles são compatíveis.
 */

export type TipoMovimentacao = "RECEITA" | "DESPESA";

/**
 * PREVISTO   — gerado por recorrência, ainda não confirmado
 * PENDENTE   — compromisso assumido, aguardando pagamento
 * PAGO       — pago, mas ainda não visto no extrato
 * CONCILIADO — casado com uma linha do extrato bancário
 */
export type StatusMovimentacao =
  | "PREVISTO"
  | "PENDENTE"
  | "PAGO"
  | "CONCILIADO"
  | "CANCELADO";

export type TipoConta =
  | "CORRENTE"
  | "POUPANCA"
  | "CAIXA"
  | "CARTAO"
  | "INVESTIMENTO";

export type FormaPagamento =
  | "PIX"
  | "DEBITO"
  | "CREDITO"
  | "BOLETO"
  | "TED"
  | "DINHEIRO"
  | "OUTRO";

export type TipoContato = "CLIENTE" | "FORNECEDOR" | "AMBOS";

export const ROTULO_TIPO_CONTATO: Record<TipoContato, string> = {
  CLIENTE: "Cliente",
  FORNECEDOR: "Fornecedor",
  AMBOS: "Cliente e fornecedor",
};

export type TipoEmpresa = "EMPRESA" | "PESSOA_FISICA";

export const ROTULO_TIPO_EMPRESA: Record<TipoEmpresa, string> = {
  EMPRESA: "Empresarial",
  PESSOA_FISICA: "Pessoal",
};

export type PapelMembro = "DONO" | "ADMIN" | "MEMBRO" | "LEITOR";

export const ROTULO_STATUS: Record<StatusMovimentacao, string> = {
  PREVISTO: "Previsto",
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CONCILIADO: "Conciliado",
  CANCELADO: "Cancelado",
};

export const ROTULO_TIPO_CONTA: Record<TipoConta, string> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Poupança",
  CAIXA: "Caixa",
  CARTAO: "Cartão de crédito",
  INVESTIMENTO: "Investimento",
};

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  BOLETO: "Boleto",
  TED: "TED",
  DINHEIRO: "Dinheiro",
  OUTRO: "Outro",
};

export const ROTULO_PAPEL: Record<PapelMembro, string> = {
  DONO: "Dono",
  ADMIN: "Administrador",
  MEMBRO: "Membro",
  LEITOR: "Leitor",
};
