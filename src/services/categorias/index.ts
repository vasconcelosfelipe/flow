import { CATEGORIAS_MOCK, MOVIMENTACOES_MOCK } from "@/lib/mock/dados";
import { linhaDreDaCategoria } from "@/services/dre";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ChaveIcone } from "@/lib/icones";
import type { TipoGrupoDre } from "@/types/dominio";

/**
 * Fase 1: junta o catálogo de categorias com o mapa de DRE e a contagem de
 * uso sobre `lib/mock`. Fase 2: uma única consulta com `_count` e `include`
 * no Prisma substitui as três fontes por uma linha de código.
 */

function contarUso(categoriaId: string): number {
  return MOVIMENTACOES_MOCK.filter((m) => m.categoria?.id === categoriaId).length;
}

const GRUPOS_RECEITA: TipoGrupoDre[] = ["RECEITA", "RECEITA_FINANCEIRA"];

export function listarCategorias(): CategoriaCompleta[] {
  return CATEGORIAS_MOCK.map((c) => {
    const linha = linhaDreDaCategoria(c.id);
    const grupoDre: TipoGrupoDre = linha?.grupo ?? "OUTROS";

    return {
      id: c.id,
      nome: c.nome,
      icone: c.icone as ChaveIcone,
      cor: c.cor,
      tipo: GRUPOS_RECEITA.includes(grupoDre) ? "RECEITA" : "DESPESA",
      grupoDre,
      linhaDreId: linha?.id ?? null,
      linhaDreNome: linha?.nome ?? "Sem conta de DRE vinculada",
      quantidadeMovimentacoes: contarUso(c.id),
    };
  });
}
