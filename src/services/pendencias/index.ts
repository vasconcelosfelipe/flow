import { MOVIMENTACOES_MOCK } from "@/lib/mock/dados";
import type {
  FiltroPendencias,
  GrupoContato,
  PaginaPendencias,
} from "@/services/pendencias/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

const ABERTOS = ["PENDENTE", "PREVISTO"] as const;

function emAberto(movs: MovimentacaoResumo[]): MovimentacaoResumo[] {
  return movs.filter((m) => ABERTOS.includes(m.status as (typeof ABERTOS)[number]));
}

function aplicarFiltro(
  movs: MovimentacaoResumo[],
  filtro: FiltroPendencias,
  hoje: Date,
): MovimentacaoResumo[] {
  return movs.filter((m) => {
    if (filtro.tipo && m.tipo !== filtro.tipo) return false;
    if (filtro.situacao === "vencidas" && !(m.dataVencimento && m.dataVencimento < hoje))
      return false;
    return true;
  });
}

/** Mais urgente primeiro: vencimento mais próximo (ou mais atrasado) no topo. */
function ordenar(movs: MovimentacaoResumo[]): MovimentacaoResumo[] {
  return [...movs].sort((a, b) => {
    const dataA = a.dataVencimento ?? new Date(8_640_000_000_000_000);
    const dataB = b.dataVencimento ?? new Date(8_640_000_000_000_000);
    return dataA.getTime() - dataB.getTime();
  });
}

function agruparPorContato(movs: MovimentacaoResumo[]): GrupoContato[] {
  const grupos = new Map<string, GrupoContato>();

  for (const mov of movs) {
    const chave = mov.contato?.id ?? "sem-contato";
    const rotulo = mov.contato?.nome ?? "Sem contato";
    const existente = grupos.get(chave);

    if (existente) {
      existente.itens.push(mov);
      existente.totalCentavos += mov.valorCentavos;
    } else {
      grupos.set(chave, { chave, rotulo, totalCentavos: mov.valorCentavos, itens: [mov] });
    }
  }

  return [...grupos.values()];
}

export function listarPendencias(
  filtro: FiltroPendencias,
  hoje = new Date(),
): PaginaPendencias {
  const filtradas = ordenar(aplicarFiltro(emAberto(MOVIMENTACOES_MOCK), filtro, hoje));

  const vencidas = filtradas.filter((m) => m.dataVencimento && m.dataVencimento < hoje);

  return {
    grupos: agruparPorContato(filtradas),
    quantidade: filtradas.length,
    totalCentavos: filtradas.reduce((soma, m) => soma + m.valorCentavos, 0),
    vencidoCentavos: vencidas.reduce((soma, m) => soma + m.valorCentavos, 0),
  };
}
