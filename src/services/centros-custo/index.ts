import { db } from "@/lib/db";
import type { CentroCustoCompleto } from "@/services/centros-custo/dto";

export async function listarCentrosCusto(empresaId: string): Promise<CentroCustoCompleto[]> {
  const centros = await db.centroCusto.findMany({
    where: { empresaId, ativo: true },
    include: { _count: { select: { movimentacoes: true } } },
    orderBy: { nome: "asc" },
  });

  return centros.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: c.cor,
    quantidadeMovimentacoes: c._count.movimentacoes,
  }));
}
