-- CreateTable
CREATE TABLE "linhas_dre" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipoPermitido" "TipoMovimentacao",

    CONSTRAINT "linhas_dre_pkey" PRIMARY KEY ("id")
);

-- Seed: as 6 linhas fixas da DRE gerencial. Cadastro de referência,
-- compartilhado por todas as empresas — não uma tabela por tenant.
INSERT INTO "linhas_dre" ("id", "nome", "ordem", "tipoPermitido") VALUES
  ('RECEITA_BRUTA', 'Receita Bruta', 1, 'RECEITA'),
  ('DEDUCOES', 'Deduções', 2, 'DESPESA'),
  ('CUSTOS', 'Custos dos Produtos', 3, 'DESPESA'),
  ('DESPESAS_OPERACIONAIS', 'Despesas Operacionais', 4, 'DESPESA'),
  ('OUTRAS_RECEITAS_DESPESAS', 'Outras Receitas/Despesas', 5, NULL),
  ('TRIBUTOS_LUCRO', 'Tributos sobre o Lucro', 6, 'DESPESA');

-- AlterTable: troca o enum "secaoDre" por uma FK de verdade para "linhas_dre"
ALTER TABLE "categorias" ADD COLUMN "linhaDreId" TEXT;

-- Migra dados existentes: RESULTADO_NAO_OPERACIONAL virou OUTRAS_RECEITAS_DESPESAS,
-- os demais valores do enum já batem com o id da linha correspondente.
UPDATE "categorias" SET "linhaDreId" = CASE "secaoDre"::TEXT
  WHEN 'RESULTADO_NAO_OPERACIONAL' THEN 'OUTRAS_RECEITAS_DESPESAS'
  ELSE "secaoDre"::TEXT
END
WHERE "secaoDre" IS NOT NULL;

ALTER TABLE "categorias" DROP COLUMN "secaoDre";
DROP TYPE "ChaveSecaoDre";

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_linhaDreId_fkey" FOREIGN KEY ("linhaDreId") REFERENCES "linhas_dre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
