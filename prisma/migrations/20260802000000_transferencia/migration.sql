-- AlterTable: transferência entre contas — duas movimentações ligadas por este id
ALTER TABLE "movimentacoes" ADD COLUMN "transferenciaId" TEXT;

-- CreateIndex
CREATE INDEX "movimentacoes_transferenciaId_idx" ON "movimentacoes"("transferenciaId");
