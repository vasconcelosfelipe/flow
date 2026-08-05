-- Mesmo padrão de "ativa" que já existe em Empresa — permite inativar o
-- acesso de um usuário no Console sem apagar a conta.
ALTER TABLE "user" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
