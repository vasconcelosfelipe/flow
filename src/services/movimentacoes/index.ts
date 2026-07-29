import { chaveDia, rotularDia } from "@/lib/dates";
import { MOVIMENTACOES_MOCK } from "@/lib/mock/dados";
import type {
  FiltroMovimentacoes,
  GrupoDiario,
  MovimentacaoResumo,
  PaginaMovimentacoes,
} from "@/services/movimentacoes/dto";

/**
 * Fase 1: filtra e agrupa sobre `lib/mock`. Fase 2: as mesmas assinaturas
 * passam a consultar o Prisma com paginação por cursor real — a tela não
 * muda, só a implementação por trás de `listarMovimentacoes`.
 */

const TAMANHO_PAGINA = 30;

function combina(texto: string, busca: string): boolean {
  return texto.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"));
}

function aplicarFiltro(
  movs: MovimentacaoResumo[],
  filtro: FiltroMovimentacoes,
): MovimentacaoResumo[] {
  return movs.filter((m) => {
    if (filtro.contaId && m.conta.id !== filtro.contaId) return false;
    if (filtro.categoriaId && m.categoria?.id !== filtro.categoriaId) return false;
    if (filtro.tipo && m.tipo !== filtro.tipo) return false;
    if (filtro.status && m.status !== filtro.status) return false;
    if (filtro.semCategoria && m.categoria !== null) return false;
    if (filtro.busca && !combina(m.descricao, filtro.busca)) return false;

    const dataRelevante = m.data ?? m.dataVencimento;
    if (filtro.de && dataRelevante && dataRelevante < filtro.de) return false;
    if (filtro.ate && dataRelevante && dataRelevante > filtro.ate) return false;

    return true;
  });
}

/** Mais recente primeiro. Sem data (previstos) vêm antes, ordenados pelo vencimento. */
function ordenar(movs: MovimentacaoResumo[]): MovimentacaoResumo[] {
  return [...movs].sort((a, b) => {
    const dataA = a.data ?? a.dataVencimento ?? new Date(0);
    const dataB = b.data ?? b.dataVencimento ?? new Date(0);
    return dataB.getTime() - dataA.getTime();
  });
}

function agruparPorDia(movs: MovimentacaoResumo[]): GrupoDiario[] {
  const grupos = new Map<string, GrupoDiario>();

  for (const mov of movs) {
    const data = mov.data ?? mov.dataVencimento;
    if (!data) continue;

    const chave = chaveDia(data);
    const existente = grupos.get(chave);
    const sinal = mov.tipo === "RECEITA" ? 1 : -1;

    if (existente) {
      existente.itens.push(mov);
      existente.totalCentavos += sinal * mov.valorCentavos;
    } else {
      grupos.set(chave, {
        chave,
        rotulo: rotularDia(data),
        totalCentavos: sinal * mov.valorCentavos,
        itens: [mov],
      });
    }
  }

  return [...grupos.values()];
}

export function listarMovimentacoes(
  filtro: FiltroMovimentacoes,
  cursor: string | null = null,
): PaginaMovimentacoes {
  const filtradas = ordenar(aplicarFiltro(MOVIMENTACOES_MOCK, filtro));

  const indiceInicial = cursor
    ? filtradas.findIndex((m) => m.id === cursor) + 1
    : 0;
  const pagina = filtradas.slice(indiceInicial, indiceInicial + TAMANHO_PAGINA);
  const proximoIndice = indiceInicial + TAMANHO_PAGINA;

  return {
    grupos: agruparPorDia(pagina),
    total: filtradas.length,
    proximoCursor: proximoIndice < filtradas.length ? pagina.at(-1)?.id ?? null : null,
  };
}

export function contarSemCategoria(): number {
  return MOVIMENTACOES_MOCK.filter((m) => m.categoria === null && m.data !== null).length;
}
