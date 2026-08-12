-- AlterTable
ALTER TABLE "movimentacoes" ADD COLUMN "divisaoId" TEXT;

-- CreateIndex
CREATE INDEX "movimentacoes_divisaoId_idx" ON "movimentacoes"("divisaoId");
