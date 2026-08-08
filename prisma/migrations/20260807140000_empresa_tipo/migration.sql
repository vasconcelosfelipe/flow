-- CreateEnum
CREATE TYPE "TipoEmpresa" AS ENUM ('EMPRESA', 'PESSOA_FISICA');

-- AlterTable: espaço de pessoa física esconde Centros de custo e troca a
-- DRE por um resumo de despesas por categoria — default EMPRESA preserva
-- o comportamento atual de toda empresa já cadastrada.
ALTER TABLE "empresas" ADD COLUMN "tipo" "TipoEmpresa" NOT NULL DEFAULT 'EMPRESA';
