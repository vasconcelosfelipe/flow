import {
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameMonth,
  isWithinInterval,
} from "date-fns";

import { formatarDataCurta, formatarMesCurto, type Periodo } from "@/lib/dates";
import { CONTAS_MOCK, MOVIMENTACOES_MOCK } from "@/lib/mock/dados";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type {
  Alerta,
  BlocoPendencias,
  PontoAcumulado,
  PontoSerie,
  ResumoDashboard,
} from "@/services/dashboard/dto";

/**
 * Fase 1: lê de `lib/mock`. Fase 2: as mesmas funções passam a consultar o
 * Prisma e devolvem exatamente estes tipos — a página não muda.
 */

const CONCILIADO = ["CONCILIADO", "PAGO"] as const;

function realizadas(movs: MovimentacaoResumo[]) {
  return movs.filter(
    (m) => m.data !== null && CONCILIADO.includes(m.status as (typeof CONCILIADO)[number]),
  );
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

/**
 * Granularidade da série: dias para recortes curtos, meses para o ano.
 * Doze meses num gráfico de celular são legíveis; trezentos e sessenta dias
 * viram uma mancha.
 */
function montarSerie(movs: MovimentacaoResumo[], periodo: Periodo): PontoSerie[] {
  const porDia = differenceInDays(periodo.ate, periodo.de) <= 62;
  const intervalos = porDia
    ? eachDayOfInterval({ start: periodo.de, end: periodo.ate })
    : eachMonthOfInterval({ start: periodo.de, end: periodo.ate });

  return intervalos.map((inicio) => {
    // Comparar por dia/mês, não por instante: os lançamentos carregam hora, e
    // `inicio` é meia-noite — comparação crua deixaria quase todo balde vazio.
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

/** Resultado somado dia a dia desde o início do período. */
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

export function obterResumoDashboard(periodo: Periodo, hoje = new Date()): ResumoDashboard {
  const todas = MOVIMENTACOES_MOCK;
  const noPeriodo = realizadas(todas).filter(
    (m) => m.data !== null && isWithinInterval(m.data, { start: periodo.de, end: periodo.ate }),
  );

  const receitas = somar(noPeriodo.filter((m) => m.tipo === "RECEITA"));
  const despesas = somar(noPeriodo.filter((m) => m.tipo === "DESPESA"));

  // Saldo é acumulado: tudo que já entrou e saiu, não só o recorte atual.
  const historico = realizadas(todas);
  const saldo =
    somar(historico.filter((m) => m.tipo === "RECEITA")) -
    somar(historico.filter((m) => m.tipo === "DESPESA"));

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
    saldoTotalCentavos: saldo,
    quantidadeContas: CONTAS_MOCK.length,
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
    alertas: montarAlertas(todas, hoje),
  };
}
