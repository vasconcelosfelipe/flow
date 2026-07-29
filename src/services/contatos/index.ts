import { db } from "@/lib/db";
import type { ContatoCompleto } from "@/services/contatos/dto";

export async function listarContatos(empresaId: string): Promise<ContatoCompleto[]> {
  const contatos = await db.contato.findMany({
    where: { empresaId, ativo: true },
    include: { _count: { select: { movimentacoes: true } } },
    orderBy: { nome: "asc" },
  });

  return contatos.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    documento: c.documento,
    quantidadeMovimentacoes: c._count.movimentacoes,
  }));
}
