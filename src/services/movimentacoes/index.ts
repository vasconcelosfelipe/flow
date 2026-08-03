import { db } from "@/lib/db";
import { chaveDia, rotularDia } from "@/lib/dates";
import type {
  FiltroMovimentacoes,
  GrupoDiario,
  MovimentacaoResumo,
  PaginaMovimentacoes,
} from "@/services/movimentacoes/dto";

const TAMANHO_PAGINA = 30;

export function mapearMovimentacao(m: {
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
  transferenciaId?: string | null;
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
    transferenciaId: m.transferenciaId ?? null,
    categoria: m.categoria
      ? {
          id: m.categoria.id,
          nome: m.categoria.nome,
          icone: m.categoria.icone,
          cor: m.categoria.cor,
        }
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

export async function listarMovimentacoes(
  empresaId: string,
  filtro: FiltroMovimentacoes,
  cursor: string | null = null,
): Promise<PaginaMovimentacoes> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    empresaId,
    ...(filtro.contaId ? { contaId: filtro.contaId } : {}),
    ...(filtro.categoriaId ? { categoriaId: filtro.categoriaId } : {}),
    ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
    // Sem filtro de status, "excluída" (CANCELADO) some da lista — é o
    // equivalente de exclusão das outras entidades (ativa: false).
    status: filtro.status ?? { not: "CANCELADO" },
    ...(filtro.busca
      ? { descricao: { contains: filtro.busca, mode: "insensitive" as const } }
      : {}),
    ...(filtro.semCategoria ? { categoriaId: null, data: { not: null } } : {}),
    ...(filtro.de || filtro.ate
      ? {
          OR: [
            {
              data: {
                ...(filtro.de ? { gte: filtro.de } : {}),
                ...(filtro.ate ? { lte: filtro.ate } : {}),
              },
            },
            {
              dataVencimento: {
                ...(filtro.de ? { gte: filtro.de } : {}),
                ...(filtro.ate ? { lte: filtro.ate } : {}),
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    db.movimentacao.count({ where }),
    db.movimentacao.findMany({
      where,
      include: {
        categoria: true,
        conta: true,
        contato: true,
      },
      orderBy: [{ data: "desc" }, { dataVencimento: "desc" }],
      take: TAMANHO_PAGINA,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
  ]);

  const movs = rows.map(mapearMovimentacao);

  return {
    grupos: agruparPorDia(movs),
    total,
    proximoCursor: rows.length === TAMANHO_PAGINA ? (rows.at(-1)?.id ?? null) : null,
  };
}

export async function contarSemCategoria(empresaId: string): Promise<number> {
  return db.movimentacao.count({
    where: { empresaId, categoriaId: null, data: { not: null } },
  });
}
