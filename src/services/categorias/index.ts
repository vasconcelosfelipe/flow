import { db } from "@/lib/db";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ChaveIcone } from "@/lib/icones";
import type { TipoGrupoDre } from "@/types/dominio";

const SECAO_PARA_GRUPO: Record<string, TipoGrupoDre> = {
  RECEITA_BRUTA: "RECEITA",
  DEDUCOES: "DEDUCAO",
  CUSTOS: "CUSTO",
  DESPESAS_OPERACIONAIS: "DESPESA",
  RESULTADO_NAO_OPERACIONAL: "RECEITA_FINANCEIRA",
  TRIBUTOS_LUCRO: "TRIBUTOS_LUCRO",
};

const SECAO_PARA_NOME: Record<string, string> = {
  RECEITA_BRUTA: "Receita bruta",
  DEDUCOES: "Deduções",
  CUSTOS: "Custos",
  DESPESAS_OPERACIONAIS: "Despesas operacionais",
  RESULTADO_NAO_OPERACIONAL: "Resultado não operacional",
  TRIBUTOS_LUCRO: "Tributos sobre o lucro",
};

export async function listarCategorias(empresaId: string): Promise<CategoriaCompleta[]> {
  const cats = await db.categoria.findMany({
    where: { empresaId, ativa: true },
    include: { _count: { select: { movimentacoes: true } } },
    orderBy: { nome: "asc" },
  });

  return cats.map((c) => {
    const secao = c.secaoDre ?? null;
    const grupoDre: TipoGrupoDre = secao ? (SECAO_PARA_GRUPO[secao] ?? "OUTROS") : "OUTROS";

    return {
      id: c.id,
      nome: c.nome,
      icone: c.icone as ChaveIcone,
      cor: c.cor,
      tipo: c.tipo,
      grupoDre,
      linhaDreId: secao,
      linhaDreNome: secao ? (SECAO_PARA_NOME[secao] ?? secao) : "Sem conta de DRE vinculada",
      quantidadeMovimentacoes: c._count.movimentacoes,
    };
  });
}
