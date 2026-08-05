import { db } from "@/lib/db";
import type { ConviteValido } from "@/services/convites/dto";

/** `null` cobre os três jeitos de um convite não servir mais: não existe,
 * já foi aceito, ou passou da validade — a tela de aceite trata os três
 * como o mesmo estado de erro, sem distinguir o motivo pra quem só recebeu
 * um link quebrado. */
export async function buscarConviteValido(token: string): Promise<ConviteValido | null> {
  const convite = await db.convite.findUnique({
    where: { token },
    include: { empresa: true },
  });

  if (!convite) return null;
  if (convite.aceitoEm !== null) return null;
  if (convite.expiraEm < new Date()) return null;

  return {
    email: convite.email,
    empresaNome: convite.empresa.nome,
    papel: convite.papel as import("@/types/dominio").PapelMembro,
  };
}
