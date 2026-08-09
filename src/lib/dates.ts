import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isSameDay,
  isSameYear,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/** Intervalo fechado. Sempre construído por `resolverPeriodo`. */
export type Periodo = {
  de: Date;
  ate: Date;
};

export const PRESETS_PERIODO = [
  "hoje",
  "7dias",
  "30dias",
  "mes",
  "ano",
] as const;

export type PresetPeriodo = (typeof PRESETS_PERIODO)[number];

export const ROTULO_PRESET: Record<PresetPeriodo, string> = {
  hoje: "Hoje",
  "7dias": "7 dias",
  "30dias": "30 dias",
  mes: "Mês",
  ano: "Ano",
};

export function resolverPeriodo(preset: PresetPeriodo, hoje = new Date()): Periodo {
  switch (preset) {
    case "hoje":
      return { de: startOfDay(hoje), ate: endOfDay(hoje) };
    case "7dias":
      return { de: startOfDay(subDays(hoje, 6)), ate: endOfDay(hoje) };
    case "30dias":
      return { de: startOfDay(subDays(hoje, 29)), ate: endOfDay(hoje) };
    case "mes":
      return { de: startOfMonth(hoje), ate: endOfMonth(hoje) };
    case "ano":
      return { de: startOfYear(hoje), ate: endOfYear(hoje) };
  }
}

/**
 * Traduz os parâmetros de URL no período correspondente.
 *
 * Existe para que servidor e cliente leiam o mesmo contrato: a página resolve
 * no servidor para renderizar já filtrada, e `usePeriodParams` resolve no
 * cliente para desenhar o controle. Divergirem seria a origem clássica de
 * "o gráfico mostra um mês e o seletor diz outro".
 */
export function resolverPeriodoDeParams(
  params: { periodo?: string; de?: string; ate?: string },
  padrao: PresetPeriodo = "mes",
): Periodo {
  if (params.de && params.ate) {
    return {
      de: startOfDay(parseISO(params.de)),
      ate: endOfDay(parseISO(params.ate)),
    };
  }
  const preset = PRESETS_PERIODO.find((p) => p === params.periodo) ?? padrao;
  return resolverPeriodo(preset);
}

/**
 * Datas de calendário puro (`@db.Date` no Prisma — movimentação, vencimento;
 * também os marcadores de período da DRE) chegam ou nascem como meia-noite
 * UTC. `format()`/`isSameDay()` do date-fns leem os componentes no fuso
 * LOCAL de quem renderiza — no servidor (container em UTC) isso não muda
 * nada, mas no navegador de qualquer usuário num fuso atrás de UTC (Brasil
 * inteiro, UTC-3) meia-noite UTC cai no dia anterior local: a data exibida
 * sai um dia atrasada da que está guardada. Este ajuste desloca o valor
 * pelo próprio offset do fuso antes de ler os componentes, fazendo o dia
 * local bater com o dia que o banco guardou.
 */
function comoCalendario(data: Date): Date {
  return new Date(data.getTime() + data.getTimezoneOffset() * 60_000);
}

/** `2025-07-15` → `"15 jul"`; em outro ano, `"15 jul 2024"`. */
export function formatarDataCurta(data: Date, hoje = new Date()): string {
  const alvo = comoCalendario(data);
  return isSameYear(alvo, hoje)
    ? format(alvo, "d MMM", { locale: ptBR })
    : format(alvo, "d MMM yyyy", { locale: ptBR });
}

/** `"15/07/2025"` — para campos e detalhes, onde ambiguidade não é aceitável. */
export function formatarData(data: Date): string {
  return format(comoCalendario(data), "dd/MM/yyyy");
}

/**
 * `"Julho de 2025"` — cabeçalho de período.
 *
 * A maiúscula é aplicada só na primeira letra, aqui e não via CSS: a classe
 * `capitalize` do CSS age em cada palavra e produziria "Julho De 2025".
 */
export function formatarMesAno(data: Date): string {
  const texto = format(comoCalendario(data), "MMMM 'de' yyyy", { locale: ptBR });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** `"jan"`, `"fev"`… — colunas da DRE anual. */
export function formatarMesCurto(data: Date): string {
  return format(comoCalendario(data), "MMM", { locale: ptBR });
}

/**
 * Agrupador da lista de movimentações. "Hoje" e "Ontem" por extenso porque é
 * assim que a pessoa pensa sobre o extrato dos últimos dois dias.
 */
export function rotularDia(data: Date, hoje = new Date()): string {
  const alvo = comoCalendario(data);
  if (isSameDay(alvo, hoje)) return "Hoje";
  if (isSameDay(alvo, subDays(hoje, 1))) return "Ontem";
  return format(alvo, "d 'de' MMMM", { locale: ptBR });
}

/** Chave estável para agrupar por dia sem esbarrar em fuso. */
export function chaveDia(data: Date): string {
  return format(comoCalendario(data), "yyyy-MM-dd");
}

/**
 * Desloca uma data-calendário (meia-noite UTC) N meses, devolvendo outra
 * data-calendário (meia-noite UTC) — nunca lendo campos locais direto, que é
 * o que fazia a navegação de mês da DRE "andar de banda" num fuso atrás de
 * UTC.
 */
export function deslocarMes(data: Date, quantidade: number): Date {
  const alvo = comoCalendario(data);
  const proximo = addMonths(alvo, quantidade);
  return new Date(Date.UTC(proximo.getFullYear(), proximo.getMonth(), 1));
}

/** `"yyyy-MM"` de uma data-calendário, sem sofrer o mesmo deslocamento de fuso. */
export function chaveMes(data: Date): string {
  return format(comoCalendario(data), "yyyy-MM");
}

/** Primeiro dia do mês de uma data-calendário, como data-calendário (meia-noite UTC). */
export function inicioMes(data: Date): Date {
  const alvo = comoCalendario(data);
  return new Date(Date.UTC(alvo.getFullYear(), alvo.getMonth(), 1));
}

/** Último dia do mês de uma data-calendário, como data-calendário (meia-noite UTC). */
export function fimMes(data: Date): Date {
  const alvo = comoCalendario(data);
  return new Date(Date.UTC(alvo.getFullYear(), alvo.getMonth() + 1, 0));
}

/** Os doze meses de um ano, como início de cada mês. Colunas da DRE anual. */
export function mesesDoAno(ano: number): Date[] {
  const janeiro = new Date(ano, 0, 1);
  return Array.from({ length: 12 }, (_, i) => addMonths(janeiro, i));
}

/**
 * Dias de atraso de um vencimento. Negativo significa que ainda vai vencer —
 * quem chama decide se isso é "vence em 3 dias" ou "vencido há 3 dias".
 */
export function diasDeAtraso(vencimento: Date, hoje = new Date()): number {
  const umDia = 86_400_000;
  return Math.floor(
    (startOfDay(hoje).getTime() - startOfDay(comoCalendario(vencimento)).getTime()) / umDia,
  );
}

/**
 * Data de vencimento da fatura do cartão que cobre uma compra feita em
 * `dataCompra`, dados o dia de fechamento e o dia de vencimento do cartão.
 * Compra depois do fechamento cai no ciclo que fecha no mês seguinte (o
 * deste mês já fechou); o vencimento cai no mesmo mês do fechamento se
 * `diaVencimentoFatura >= diaFechamento`, ou no mês seguinte — caso comum:
 * fecha dia 25, vence dia 5. Mesma disciplina de data-calendário do resto
 * do arquivo — nunca lê campo local direto.
 */
export function calcularVencimentoFatura(
  dataCompra: Date,
  diaFechamento: number,
  diaVencimentoFatura: number,
): Date {
  const alvo = comoCalendario(dataCompra);

  const ano = alvo.getFullYear();
  let mes = alvo.getMonth();
  if (alvo.getDate() > diaFechamento) mes += 1;
  if (diaVencimentoFatura < diaFechamento) mes += 1;

  // Clampa o dia ao último dia do mês-alvo — cartão configurado pra
  // vencer dia 31 não pode estourar pra março num mês de 28/30 dias.
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const dia = Math.min(diaVencimentoFatura, ultimoDiaDoMes);

  return new Date(Date.UTC(ano, mes, dia));
}
