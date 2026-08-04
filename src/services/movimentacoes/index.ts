import { db } from "@/lib/db";
import { chaveDia, rotularDia } from "@/lib/dates";
import type {
  FiltroMovimentacoes,
  GrupoDiario,
  MovimentacaoResumo,
  PaginaMovimentacoes,
} from "@/services/movimentacoes/dto";

const TAMANHO_PAGINA = 30;

export function mapearMovimentacao(
  m: {
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
    origemFitId?: string | null;
    categoria: { id: string; nome: string; icone: string; cor: string } | null;
    conta: { id: string; nome: string; cor: string; tipo: string };
    contato: { id: string; nome: string } | null;
  },
  contaPar: { id: string; nome: string; cor: string; tipo: string } | null = null,
): MovimentacaoResumo {
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
    contaPar: contaPar
      ? {
          id: contaPar.id,
          nome: contaPar.nome,
          cor: contaPar.cor,
          tipo: contaPar.tipo as MovimentacaoResumo["conta"]["tipo"],
        }
      : null,
    origemFitId: m.origemFitId ?? null,
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

const REALIZADO = ["PAGO", "CONCILIADO"];

function agruparPorDia(movs: MovimentacaoResumo[]): GrupoDiario[] {
  const grupos = new Map<string, GrupoDiario>();

  for (const mov of movs) {
    const data = mov.data ?? mov.dataVencimento;
    if (!data) continue;

    const chave = chaveDia(data);
    const existente = grupos.get(chave);
    const sinal = mov.tipo === "RECEITA" ? 1 : -1;
    const realizado = REALIZADO.includes(mov.status);

    if (existente) {
      existente.itens.push(mov);
      existente.totalCentavos += sinal * mov.valorCentavos;
      if (realizado) existente.totalRealizadoCentavos += sinal * mov.valorCentavos;
    } else {
      grupos.set(chave, {
        chave,
        rotulo: rotularDia(data),
        totalCentavos: sinal * mov.valorCentavos,
        totalRealizadoCentavos: realizado ? sinal * mov.valorCentavos : 0,
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
    // Sem filtro de status, só mostra o que já aconteceu de fato (pago ou
    // conciliado) — agendamento (PENDENTE/PREVISTO) é assunto da tela de A
    // pagar/receber, e CANCELADO é o equivalente de exclusão das outras
    // entidades (ativa: false), nunca aparece.
    status: filtro.status ?? { in: REALIZADO },
    ...(filtro.busca
      ? { descricao: { contains: filtro.busca, mode: "insensitive" as const } }
      : {}),
    ...(filtro.semCategoria
      ? { categoriaId: null, data: { not: null }, transferenciaId: null }
      : {}),
    // O lado `dataVencimento` deste OR só importa quando `filtro.status` for
    // sobrescrito pra incluir PENDENTE/PREVISTO (via o Select de Status) —
    // no padrão (só realizado), toda linha já tem `data` preenchida.
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
    // Sem conta filtrada, uma transferência mostra só a perna DESPESA —
    // evita duas linhas pro mesmo par. Com conta filtrada, o próprio filtro
    // de contaId já resolve (cada perna tem uma conta diferente).
    ...(filtro.contaId ? {} : { NOT: { transferenciaId: { not: null }, tipo: "RECEITA" } }),
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

  const idsTransferencia = rows
    .filter((r) => r.transferenciaId !== null)
    .map((r) => r.transferenciaId!);

  const pares =
    idsTransferencia.length > 0
      ? await db.movimentacao.findMany({
          where: {
            transferenciaId: { in: idsTransferencia },
            id: { notIn: rows.map((r) => r.id) },
          },
          select: { transferenciaId: true, conta: true },
        })
      : [];
  const contaParPorTransferencia = new Map(pares.map((p) => [p.transferenciaId!, p.conta]));

  const movs = rows.map((r) =>
    mapearMovimentacao(r, r.transferenciaId ? (contaParPorTransferencia.get(r.transferenciaId) ?? null) : null),
  );

  return {
    grupos: agruparPorDia(movs),
    total,
    proximoCursor: rows.length === TAMANHO_PAGINA ? (rows.at(-1)?.id ?? null) : null,
  };
}

export async function contarSemCategoria(empresaId: string): Promise<number> {
  return db.movimentacao.count({
    // Transferência nunca tem categoria por design (não é receita nem
    // despesa de verdade) — não conta como "esqueceram de categorizar".
    where: { empresaId, categoriaId: null, data: { not: null }, transferenciaId: null },
  });
}

/** Saldo real de uma conta específica — mesma conta usada no saldo total do Início. */
export async function obterSaldoConta(empresaId: string, contaId: string): Promise<number> {
  const conta = await db.conta.findFirstOrThrow({
    where: { id: contaId, empresaId },
    include: {
      movimentacoes: {
        where: { status: { in: ["PAGO", "CONCILIADO"] } },
        select: { tipo: true, valorCentavos: true },
      },
    },
  });
  return conta.saldoInicial + conta.movimentacoes.reduce(
    (s, m) => s + (m.tipo === "RECEITA" ? m.valorCentavos : -m.valorCentavos),
    0,
  );
}
