import {
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameMonth,
  isWithinInterval,
} from "date-fns";

import { db } from "@/lib/db";
import { formatarDataCurta, formatarMesCurto, type Periodo } from "@/lib/dates";
import { contarSemCategoria } from "@/services/movimentacoes";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type {
  Alerta,
  BlocoPendencias,
  PontoAcumulado,
  PontoSerie,
  ResumoDashboard,
} from "@/services/dashboard/dto";

/** Transferência entre contas não é receita, despesa, nem "sem categoria" —
 * é o mesmo dinheiro mudando de bolso. Fora das métricas de resultado. */
function semTransferencia(movs: MovimentacaoResumo[]) {
  return movs.filter((m) => m.transferenciaId === null);
}

function mapearParaResumo(m: {
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
    tipo: m.tipo as "RECEITA" | "DESPESA",
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
    conta: { id: m.conta.id, nome: m.conta.nome, cor: m.conta.cor, tipo: m.conta.tipo as MovimentacaoResumo["conta"]["tipo"] },
    contato: m.contato ? { id: m.contato.id, nome: m.contato.nome } : null,
  };
}

function somar(movs: MovimentacaoResumo[]): number {
  return movs.reduce((total, m) => total + m.valorCentavos, 0);
}

function pendencias(
  movs: MovimentacaoResumo[],
  tipo: "RECEITA" | "DESPESA",
  hoje: Date,
): BlocoPendencias {
  const abertas = movs.filter(
    (m) => m.tipo === tipo && (m.status === "PENDENTE" || m.status === "PREVISTO"),
  );
  const vencidas = abertas.filter(
    (m) => m.dataVencimento !== null && m.dataVencimento < hoje,
  );
  return {
    totalCentavos: somar(abertas),
    quantidade: abertas.length,
    vencidoCentavos: somar(vencidas),
  };
}

function montarSerie(movs: MovimentacaoResumo[], periodo: Periodo): PontoSerie[] {
  const porDia = differenceInDays(periodo.ate, periodo.de) <= 62;
  const intervalos = porDia
    ? eachDayOfInterval({ start: periodo.de, end: periodo.ate })
    : eachMonthOfInterval({ start: periodo.de, end: periodo.ate });

  return intervalos.map((inicio) => {
    const doIntervalo = movs.filter(
      (m) =>
        m.data !== null &&
        (porDia ? isSameDay(m.data, inicio) : isSameMonth(m.data, inicio)),
    );
    return {
      rotulo: porDia ? formatarDataCurta(inicio) : formatarMesCurto(inicio),
      receitasCentavos: somar(doIntervalo.filter((m) => m.tipo === "RECEITA")),
      despesasCentavos: somar(doIntervalo.filter((m) => m.tipo === "DESPESA")),
    };
  });
}

function montarAcumulado(serie: PontoSerie[]): PontoAcumulado[] {
  let acumulado = 0;
  return serie.map((ponto) => {
    acumulado += ponto.receitasCentavos - ponto.despesasCentavos;
    return { rotulo: ponto.rotulo, acumuladoCentavos: acumulado };
  });
}

/** `abertas` já vem filtrada por status PENDENTE/PREVISTO — não precisa
 * refiltrar aqui. `semCategoriaCount` vem de uma consulta separada (só
 * COUNT, sem trazer linha nenhuma) porque essa checagem é sempre "desde o
 * início dos tempos", independente do período do dashboard. */
function montarAlertas(abertas: MovimentacaoResumo[], semCategoriaCount: number, hoje: Date): Alerta[] {
  const alertas: Alerta[] = [];

  const vencidas = abertas.filter(
    (m) => m.tipo === "DESPESA" && m.dataVencimento !== null && m.dataVencimento < hoje,
  );

  if (vencidas.length > 0) {
    alertas.push({
      id: "vencidas",
      severidade: "critico",
      titulo: `${vencidas.length} conta${vencidas.length > 1 ? "s" : ""} vencida${vencidas.length > 1 ? "s" : ""}`,
      descricao: "Passaram do vencimento e continuam em aberto.",
      acao: { rotulo: "Ver pendências", href: "/a-pagar-receber?situacao=vencidas" },
    });
  }

  if (semCategoriaCount > 0) {
    alertas.push({
      id: "sem-categoria",
      severidade: "atencao",
      titulo: `${semCategoriaCount} lançamentos sem categoria`,
      descricao: "Enquanto não forem categorizados, ficam fora da DRE.",
      acao: { rotulo: "Categorizar agora", href: "/movimentacoes?semCategoria=1" },
    });
  }

  return alertas;
}

export async function obterResumoDashboard(
  empresaId: string,
  periodo: Periodo,
  hoje = new Date(),
): Promise<ResumoDashboard> {
  const duracao = differenceInDays(periodo.ate, periodo.de) + 1;
  const anterior = {
    de: new Date(periodo.de.getTime() - duracao * 86_400_000),
    ate: periodo.de,
  };

  // Duas consultas em vez de uma só "trazer tudo": pendências em aberto não
  // têm limite de data (uma pendência de anos atrás ainda é uma pendência),
  // mas o histórico realizado só precisa cobrir o período atual + o anterior
  // (pra comparação) — sem isso, esta consulta cresce pra sempre com o
  // histórico da empresa e fica mais lenta a cada mês que passa.
  const [abertasRows, historicoRows, ultimasRows, contas, semCategoriaCount] = await Promise.all([
    db.movimentacao.findMany({
      where: { empresaId, status: { in: ["PENDENTE", "PREVISTO"] } },
      include: { categoria: true, conta: true, contato: true },
    }),
    db.movimentacao.findMany({
      where: {
        empresaId,
        status: { in: ["PAGO", "CONCILIADO"] },
        data: { gte: anterior.de, lte: periodo.ate },
        // Cada transferência gera duas pernas (saída e entrada) — sem
        // filtrar nenhuma conta específica aqui, mostrar as duas duplicaria
        // o lançamento em "Últimas movimentações". Mesma regra de
        // `listarMovimentacoes`: mantém só a perna DESPESA.
        NOT: { transferenciaId: { not: null }, tipo: "RECEITA" },
      },
      include: { categoria: true, conta: true, contato: true },
    }),
    // "Últimas movimentações" é sempre "o que aconteceu por último" de
    // verdade — não some nem troca de conteúdo quando a pessoa navega o
    // PeriodPicker pra outro mês, então é uma consulta própria, sem o
    // limite de `periodo` que a série/resultado usam.
    db.movimentacao.findMany({
      where: {
        empresaId,
        status: { in: ["PAGO", "CONCILIADO"] },
        NOT: { transferenciaId: { not: null }, tipo: "RECEITA" },
      },
      include: { categoria: true, conta: true, contato: true },
      orderBy: { data: "desc" },
      take: 6,
    }),
    db.conta.findMany({
      where: { empresaId, ativa: true },
      include: {
        movimentacoes: {
          where: { status: { in: ["PAGO", "CONCILIADO"] } },
          select: { tipo: true, valorCentavos: true },
        },
      },
    }),
    contarSemCategoria(empresaId),
  ]);

  const abertas = abertasRows.map(mapearParaResumo);
  const historico = historicoRows.map(mapearParaResumo);
  const ultimasMovimentacoes = ultimasRows.map(mapearParaResumo);

  // Os cartões "A pagar"/"A receber" seguem o período selecionado no topo —
  // diferente do alerta de vencidas (sempre olha tudo, uma pendência antiga
  // não deixa de ser vencida só porque o filtro mudou de mês).
  const abertasNoPeriodo = abertas.filter(
    (m) =>
      m.dataVencimento !== null &&
      isWithinInterval(m.dataVencimento, { start: periodo.de, end: periodo.ate }),
  );

  const noPeriodo = historico.filter(
    (m) => m.data !== null && isWithinInterval(m.data, { start: periodo.de, end: periodo.ate }),
  );
  const noPeriodoSemTransferencia = semTransferencia(noPeriodo);

  const receitas = somar(noPeriodoSemTransferencia.filter((m) => m.tipo === "RECEITA"));
  const despesas = somar(noPeriodoSemTransferencia.filter((m) => m.tipo === "DESPESA"));

  const historicoSemTransferencia = semTransferencia(historico);
  const saldoContas = contas.reduce((total, c) => {
    const saldo =
      c.saldoInicial +
      c.movimentacoes.reduce(
        (s, m) => s + (m.tipo === "RECEITA" ? m.valorCentavos : -m.valorCentavos),
        0,
      );
    return total + saldo;
  }, 0);

  const doAnterior = historicoSemTransferencia.filter(
    (m) => m.data !== null && m.data >= anterior.de && m.data < anterior.ate,
  );
  const resultadoAnterior =
    somar(doAnterior.filter((m) => m.tipo === "RECEITA")) -
    somar(doAnterior.filter((m) => m.tipo === "DESPESA"));
  const resultado = receitas - despesas;
  const serie = montarSerie(historicoSemTransferencia, periodo);

  return {
    saldoTotalCentavos: saldoContas,
    quantidadeContas: contas.length,
    receitasCentavos: receitas,
    despesasCentavos: despesas,
    variacaoResultado:
      resultadoAnterior === 0
        ? null
        : Math.round(((resultado - resultadoAnterior) / Math.abs(resultadoAnterior)) * 10_000),
    aPagar: pendencias(abertasNoPeriodo, "DESPESA", hoje),
    aReceber: pendencias(abertasNoPeriodo, "RECEITA", hoje),
    serie,
    serieAcumulada: montarAcumulado(serie),
    ultimasMovimentacoes,
    alertas: montarAlertas(abertas, semCategoriaCount, hoje),
  };
}
