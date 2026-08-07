-- Só usados quando Conta.tipo = CARTAO — dia de fechamento e de
-- vencimento da fatura, base pro cálculo de em qual ciclo uma compra cai.
ALTER TABLE "contas" ADD COLUMN "diaFechamento" INTEGER;
ALTER TABLE "contas" ADD COLUMN "diaVencimentoFatura" INTEGER;
