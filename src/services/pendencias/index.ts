import { db } from "@/lib/db";
import { calcularVencimentoFatura, type Periodo } from "@/lib/dates";
import { listarContas } from "@/services/contas";
import { listarFaturaCartao } from "@/services/movimentacoes";
import type {
  FiltroPendencias,
  PaginaPendencias,
  TotalPendencia,
  TotaisPendencias,
} from "@/services/pendencias/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

/**
 * A fatura de um cartão não é uma `Movimentacao` — é a soma das compras do
 * ciclo que vence agora (mesma consulta da tela da fatura, `listarFaturaCartao`),
 * lida ao vivo a cada carregamento. Por isso "atualiza sozinha": não existe
 * snapshot gravado.
 *
 * O valor mostrado é limitado ao saldo devedor atual da conta
 * (`min(total do ciclo, saldo devedor))`. `saldoCentavos` já é a dívida
 * líquida de tudo — compras de todos os ciclos menos toda transferência de
 * pagamento recebida — então esse teto é o que faz a fatura diminuir (e
 * eventualmente sumir da lista) conforme o pagamento entra, mesmo sendo
 * parcial, sem precisar casar transferência com ciclo específico. Sem
 * pagamento nenhum, o saldo devedor de ciclos anteriores nunca pagos deixa
 * o teto sempre maior que o ciclo atual, então o `min` não interfere.
 */
async function listarFaturasAbertas(empresaId: string, hoje: Date): Promise<MovimentacaoResumo[]> {
  const contas = await listarContas(empresaId);
  const cartoes = contas.filter(
    (c) => c.tipo === "CARTAO" && c.diaFechamento !== null && c.diaVencimentoFatura !== null,
  );

  const faturas = await Promise.all(
    cartoes.map(async (conta) => {
      const vencimento = calcularVencimentoFatura(hoje, conta.diaFechamento!, conta.diaVencimentoFatura!);
      const itens = await listarFaturaCartao(empresaId, conta.id, vencimento);
      const totalCiclo = itens.reduce(
        (soma, m) => soma + (m.tipo === "RECEITA" ? -m.valorCentavos : m.valorCentavos),
        0,
      );
      const saldoDevedor = Math.max(-conta.saldoCentavos, 0);
      const valorCentavos = Math.min(totalCiclo, saldoDevedor);
      if (valorCentavos <= 0) return null;
      const fatura: MovimentacaoResumo = {
        id: `fatura-${conta.id}`,
        descricao: `Fatura ${conta.nome}`,
        valorCentavos,
        tipo: "DESPESA",
        status: "PENDENTE",
        data: null,
        dataVencimento: vencimento,
        categoria: null,
        conta: { id: conta.id, nome: conta.nome, cor: conta.cor, tipo: conta.tipo },
        contato: null,
        numeroParcela: null,
        totalParcelas: null,
        recorrente: false,
        transferenciaId: null,
        contaPar: null,
        origemFitId: null,
      };
      return fatura;
    }),
  );

  return faturas.filter((f): f is MovimentacaoResumo => f !== null);
}

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
      ...(filtro.de && filtro.ate ? { dataVencimento: { gte: filtro.de, lte: filtro.ate } } : {}),
    },
    include: {
      categoria: true,
      conta: true,
      contato: true,
    },
    orderBy: { dataVencimento: "asc" },
  });

  const faturas = filtro.tipo && filtro.tipo !== "DESPESA" ? [] : await listarFaturasAbertas(empresaId, hoje);
  const faturasNoPeriodo = faturas.filter(
    (f) => !filtro.de || !filtro.ate || (f.dataVencimento! >= filtro.de && f.dataVencimento! <= filtro.ate),
  );

  const itens = [...rows.map(mapearMovimentacao), ...faturasNoPeriodo].sort(
    (a, b) => (a.dataVencimento?.getTime() ?? 0) - (b.dataVencimento?.getTime() ?? 0),
  );

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
 * zeraria quando a pessoa estivesse olhando a aba "A receber".
 */
export async function obterTotaisPendencias(
  empresaId: string,
  periodo: Periodo,
  hoje = new Date(),
): Promise<TotaisPendencias> {
  const [rows, faturas] = await Promise.all([
    db.movimentacao.findMany({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "PREVISTO"] },
        dataVencimento: { gte: periodo.de, lte: periodo.ate },
      },
      select: { tipo: true, valorCentavos: true, dataVencimento: true },
    }),
    listarFaturasAbertas(empresaId, hoje),
  ]);

  const faturasNoPeriodo = faturas.filter(
    (f) => f.dataVencimento! >= periodo.de && f.dataVencimento! <= periodo.ate,
  );
  const todos = [
    ...rows,
    ...faturasNoPeriodo.map((f) => ({
      tipo: f.tipo,
      valorCentavos: f.valorCentavos,
      dataVencimento: f.dataVencimento,
    })),
  ];

  function bloco(tipo: "DESPESA" | "RECEITA"): TotalPendencia {
    const doTipo = todos.filter((r) => r.tipo === tipo);
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
