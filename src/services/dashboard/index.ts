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
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type {
  Alerta,
  BlocoPendencias,
  PontoAcumulado,
  PontoSerie,
  ResumoDashboard,
} from "@/services/dashboard/dto";

const CONCILIADO = ["CONCILIADO", "PAGO"] as const;

function realizadas(movs: MovimentacaoResumo[]) {
  return movs.filter(
    (m) => m.data !== null && CONCILIADO.includes(m.status as (typeof CONCILIADO)[number]),
  );
}

/** Transferência entre contas não é receita, despesa, nem "sem categoria" —
 * é o mesmo dinheiro mudando de bolso. Fora das métricas de resultado. */
function semTransferencia(movs: MovimentacaoResumo[]) {
  return movs.filter((m) => m.transferenciaId === null);
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

function montarAlertas(movs: MovimentacaoResumo[], hoje: Date): Alerta[] {
  const alertas: Alerta[] = [];

  const vencidas = movs.filter(
    (m) =>
      m.tipo === "DESPESA" &&
      (m.status === "PENDENTE" || m.status === "PREVISTO") &&
      m.dataVencimento !== null &&
      m.dataVencimento < hoje,
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

  const semCategoria = movs.filter((m) => m.categoria === null && m.data !== null);
  if (semCategoria.length > 0) {
    alertas.push({
      id: "sem-categoria",
      severidade: "atencao",
      titulo: `${semCategoria.length} lançamentos sem categoria`,
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
  const [rows, contas] = await Promise.all([
    db.movimentacao.findMany({
      where: { empresaId },
      include: { categoria: true, conta: true, contato: true },
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
  ]);

  const todas: MovimentacaoResumo[] = rows.map((m) => ({
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
  }));

  // Últimas movimentações mostram tudo (transferência inclusa — é atividade
  // real da conta); resultado/série/histórico ficam de fora dela.
  const noPeriodo = realizadas(todas).filter(
    (m) => m.data !== null && isWithinInterval(m.data, { start: periodo.de, end: periodo.ate }),
  );
  const noPeriodoSemTransferencia = semTransferencia(noPeriodo);

  const receitas = somar(noPeriodoSemTransferencia.filter((m) => m.tipo === "RECEITA"));
  const despesas = somar(noPeriodoSemTransferencia.filter((m) => m.tipo === "DESPESA"));

  const historico = semTransferencia(realizadas(todas));
  const saldoContas = contas.reduce((total, c) => {
    const saldo =
      c.saldoInicial +
      c.movimentacoes.reduce(
        (s, m) => s + (m.tipo === "RECEITA" ? m.valorCentavos : -m.valorCentavos),
        0,
      );
    return total + saldo;
  }, 0);

  const duracao = differenceInDays(periodo.ate, periodo.de) + 1;
  const anterior = {
    de: new Date(periodo.de.getTime() - duracao * 86_400_000),
    ate: periodo.de,
  };
  const doAnterior = historico.filter(
    (m) => m.data !== null && m.data >= anterior.de && m.data < anterior.ate,
  );
  const resultadoAnterior =
    somar(doAnterior.filter((m) => m.tipo === "RECEITA")) -
    somar(doAnterior.filter((m) => m.tipo === "DESPESA"));
  const resultado = receitas - despesas;
  const serie = montarSerie(historico, periodo);

  return {
    saldoTotalCentavos: saldoContas,
    quantidadeContas: contas.length,
    receitasCentavos: receitas,
    despesasCentavos: despesas,
    variacaoResultado:
      resultadoAnterior === 0
        ? null
        : Math.round(((resultado - resultadoAnterior) / Math.abs(resultadoAnterior)) * 10_000),
    aPagar: pendencias(todas, "DESPESA", hoje),
    aReceber: pendencias(todas, "RECEITA", hoje),
    serie,
    serieAcumulada: montarAcumulado(serie),
    ultimasMovimentacoes: noPeriodo
      .slice()
      .sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0))
      .slice(0, 6),
    alertas: montarAlertas(semTransferencia(todas), hoje),
  };
}
