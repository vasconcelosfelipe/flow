-- AlterTable: subcategoria — categoria aponta pra outra categoria como pai (um único nível)
ALTER TABLE "categorias" ADD COLUMN "categoriaPaiId" TEXT;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_categoriaPaiId_fkey" FOREIGN KEY ("categoriaPaiId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "categorias_categoriaPaiId_idx" ON "categorias"("categoriaPaiId");
