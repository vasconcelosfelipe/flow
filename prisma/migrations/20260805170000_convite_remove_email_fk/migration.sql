-- Remove a FK de convites.email -> user.email: convite existe justamente
-- para pessoas que ainda NÃO têm conta, então exigir um user.email
-- correspondente quebrava o próprio caso de uso (erro P2003 ao criar
-- convite pra e-mail novo).
ALTER TABLE "convites" DROP CONSTRAINT IF EXISTS "convites_email_fkey";
