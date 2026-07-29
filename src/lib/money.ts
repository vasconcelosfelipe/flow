/**
 * Dinheiro no Flow é sempre um inteiro de centavos.
 *
 * O banco guarda Decimal(14,2), mas nada em ponto flutuante cruza a rede nem
 * entra em conta: `0.1 + 0.2` não é `0.3`, e numa DRE isso vira centavo faltando
 * no resultado do mês. A conversão acontece uma única vez, na borda do service.
 */

export type Centavos = number;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_SEM_SIMBOLO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACTO = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** `123456` → `"R$ 1.234,56"` */
export function formatarMoeda(centavos: Centavos): string {
  return BRL.format(centavos / 100);
}

/** `123456` → `"1.234,56"`. Para tabelas onde o símbolo já está no cabeçalho. */
export function formatarValor(centavos: Centavos): string {
  return BRL_SEM_SIMBOLO.format(centavos / 100);
}

/**
 * `1234567` → `"12,3 mil"`. Usado nas colunas da DRE anual, onde doze meses
 * precisam caber sem rolagem lateral no celular.
 */
export function formatarCompacto(centavos: Centavos): string {
  return COMPACTO.format(centavos / 100);
}

/** `1234` → `"12,34%"`. Recebe a razão já multiplicada por 10.000. */
export function formatarPercentual(basisPoints: number): string {
  return `${BRL_SEM_SIMBOLO.format(basisPoints / 100)}%`;
}

/**
 * Margem em basis points (centésimos de ponto percentual). Devolve `null`
 * quando não há base — margem sobre receita zero não é 0%, é indefinida, e
 * exibir "0,00%" nesse caso seria mentira.
 */
export function calcularMargem(valor: Centavos, base: Centavos): number | null {
  if (base === 0) return null;
  return Math.round((valor / base) * 10_000);
}

/**
 * Converte texto digitado em centavos. Aceita as formas que aparecem de fato
 * num campo de valor: "1.234,56", "1234,56", "1234.56", "R$ 1.234,56".
 * Devolve `null` quando não dá para interpretar — cabe a quem chama decidir
 * se isso é erro de validação ou campo vazio.
 */
export function parseMoeda(entrada: string): Centavos | null {
  const limpo = entrada.replace(/[^\d,.-]/g, "").trim();
  if (limpo === "" || limpo === "-") return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normalizado = limpo;
  if (temVirgula && temPonto) {
    // "1.234,56" — o ponto é separador de milhar.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    normalizado = limpo.replace(",", ".");
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;

  return Math.round(numero * 100);
}

/**
 * Divide um total em N parcelas sem perder centavo: o resto da divisão vai
 * inteiro para a primeira parcela. `soma(dividirEmParcelas(t, n)) === t` sempre.
 */
export function dividirEmParcelas(total: Centavos, parcelas: number): Centavos[] {
  if (parcelas < 1) throw new Error("Número de parcelas deve ser ao menos 1.");

  const base = Math.floor(Math.abs(total) / parcelas);
  const resto = Math.abs(total) - base * parcelas;
  const sinal = Math.sign(total) || 1;

  return Array.from({ length: parcelas }, (_, i) =>
    sinal * (i === 0 ? base + resto : base),
  );
}
