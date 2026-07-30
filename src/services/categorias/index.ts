import { db } from "@/lib/db";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ChaveIcone } from "@/lib/icones";

export async function listarCategorias(empresaId: string): Promise<CategoriaCompleta[]> {
  const cats = await db.categoria.findMany({
    where: { empresaId, ativa: true },
    include: { linhaDre: true, _count: { select: { movimentacoes: true } } },
    orderBy: { nome: "asc" },
  });

  return cats.map((c) => ({
    id: c.id,
    nome: c.nome,
    icone: c.icone as ChaveIcone,
    cor: c.cor,
    tipo: c.tipo,
    linhaDreId: c.linhaDreId,
    linhaDreNome: c.linhaDre?.nome ?? "Sem linha de DRE vinculada",
    quantidadeMovimentacoes: c._count.movimentacoes,
  }));
}
