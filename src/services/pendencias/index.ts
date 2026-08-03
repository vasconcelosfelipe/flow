import { db } from "@/lib/db";
import type {
  FiltroPendencias,
  GrupoContato,
  PaginaPendencias,
} from "@/services/pendencias/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

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
        : {}),
    },
    include: {
      categoria: true,
      conta: true,
      contato: true,
    },
    orderBy: { dataVencimento: "asc" },
  });

  const movs: MovimentacaoResumo[] = rows.map((m) => ({
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
  }));

  const vencidas = movs.filter(
    (m) => m.dataVencimento !== null && m.dataVencimento < hoje,
  );

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

  return {
    grupos: [...grupos.values()],
    quantidade: movs.length,
    totalCentavos: movs.reduce((s, m) => s + m.valorCentavos, 0),
    vencidoCentavos: vencidas.reduce((s, m) => s + m.valorCentavos, 0),
  };
}
