-- AlterTable: chave de dedup pra linhas de OFX marcadas "ignorar permanentemente"
ALTER TABLE "importacao_linhas" ADD COLUMN "contaId" TEXT;
ALTER TABLE "importacao_linhas" ADD COLUMN "fitId" TEXT;

-- CreateIndex
CREATE INDEX "importacao_linhas_contaId_fitId_idx" ON "importacao_linhas"("contaId", "fitId");
