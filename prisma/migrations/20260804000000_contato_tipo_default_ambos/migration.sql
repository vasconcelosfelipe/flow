-- AlterTable: cadastro de fornecedor/cliente não pergunta mais o tipo — todo
-- registro serve pra ambos os papéis; a coluna fica só como default técnico.
ALTER TABLE "contatos" ALTER COLUMN "tipo" SET DEFAULT 'AMBOS';
