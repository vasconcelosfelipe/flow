-- AlterTable: FITID do OFX de origem — chave de deduplicação de importação
ALTER TABLE "movimentacoes" ADD COLUMN "origemFitId" TEXT;

-- CreateIndex (Postgres trata NULL como distinto: lançamentos manuais nunca colidem entre si)
CREATE UNIQUE INDEX "movimentacoes_contaId_origemFitId_key" ON "movimentacoes"("contaId", "origemFitId");
