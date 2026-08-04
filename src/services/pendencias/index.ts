import { db } from "@/lib/db";
import type { Periodo } from "@/lib/dates";
import type {
  FiltroPendencias,
  PaginaPendencias,
  TotalPendencia,
  TotaisPendencias,
} from "@/services/pendencias/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

function mapearMovimentacao(m: {
  id: string;
  descricao: string;
  valorCentavos: number;
  tipo: string;
  status: string;
  data: Date | null;
  dataVencimento: Date | null;
  numeroParcela: number | null;
  totalParcelas: number | null;
  recorrente: boolean;
  transferenciaId: string | null;
  origemFitId: string | null;
  categoria: { id: string; nome: string; icone: string; cor: string } | null;
  conta: { id: string; nome: string; cor: string; tipo: string };
  contato: { id: string; nome: string } | null;
}): MovimentacaoResumo {
  return {
    id: m.id,
    descricao: m.descricao,
    valorCentavos: m.valorCentavos,
    tipo: m.tipo as MovimentacaoResumo["tipo"],
    status: m.status as MovimentacaoResumo["status"],
    data: m.data,
    dataVencimento: m.dataVencimento,
    numeroParcela: m.numeroParcela,
    totalParcelas: m.totalParcelas,
    recorrente: m.recorrente,
    transferenciaId: m.transferenciaId,
    contaPar: null,
    origemFitId: m.origemFitId,
    categoria: m.categoria
      ? { id: m.categoria.id, nome: m.categoria.nome, icone: m.categoria.icone, cor: m.categoria.cor }
      : null,
    conta: {
      id: m.conta.id,
      nome: m.conta.nome,
      cor: m.conta.cor,
      tipo: m.conta.tipo as MovimentacaoResumo["conta"]["tipo"],
    },
    contato: m.contato ? { id: m.contato.id, nome: m.contato.nome } : null,
  };
}

export async function listarPendencias(
  empresaId: string,
  filtro: FiltroPendencias,
  hoje = new Date(),
): Promise<PaginaPendencias> {
  const rows = await db.movimentacao.findMany({
    where: {
      empresaId,
      status: { in: ["PENDENTE", "PREVISTO"] },
      ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
      ...(filtro.situacao === "vencidas"
        ? { dataVencimento: { lt: hoje } }
        : filtro.de && filtro.ate
          ? { dataVencimento: { gte: filtro.de, lte: filtro.ate } }
          : {}),
    },
    include: {
      categoria: true,
      conta: true,
      contato: true,
    },
    orderBy: { dataVencimento: "asc" },
  });

  const itens = rows.map(mapearMovimentacao);

  const vencidas = itens.filter(
    (m) => m.dataVencimento !== null && m.dataVencimento < hoje,
  );

  return {
    itens,
    quantidade: itens.length,
    totalCentavos: itens.reduce((s, m) => s + m.valorCentavos, 0),
    vencidoCentavos: vencidas.reduce((s, m) => s + m.valorCentavos, 0),
  };
}

/**
 * Totais dos cards "A pagar"/"A receber" — sempre os dois juntos, nunca
 * filtrados pela aba de tipo selecionada na lista, senão o card "A pagar"
 * zeraria quando a pessoa estivesse olhando a aba "A receber". `periodo:
 * null` (atalho de vencidas do dashboard) devolve o total sem limite de
 * data, pelo mesmo motivo do bypass em `listarPendencias`.
 */
export async function obterTotaisPendencias(
  empresaId: string,
  periodo: Periodo | null,
  hoje = new Date(),
): Promise<TotaisPendencias> {
  const rows = await db.movimentacao.findMany({
    where: {
      empresaId,
      status: { in: ["PENDENTE", "PREVISTO"] },
      ...(periodo ? { dataVencimento: { gte: periodo.de, lte: periodo.ate } } : {}),
    },
    select: { tipo: true, valorCentavos: true, dataVencimento: true },
  });

  function bloco(tipo: "DESPESA" | "RECEITA"): TotalPendencia {
    const doTipo = rows.filter((r) => r.tipo === tipo);
    const vencidas = doTipo.filter(
      (r) => r.dataVencimento !== null && r.dataVencimento < hoje,
    );
    return {
      totalCentavos: doTipo.reduce((s, r) => s + r.valorCentavos, 0),
      quantidade: doTipo.length,
      vencidoCentavos: vencidas.reduce((s, r) => s + r.valorCentavos, 0),
    };
  }

  return { aPagar: bloco("DESPESA"), aReceber: bloco("RECEITA") };
}
