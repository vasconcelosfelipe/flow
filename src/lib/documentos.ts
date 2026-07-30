/**
 * CPF e CNPJ — máscara (o que aparece no campo) e validação por dígito
 * verificador (o que decide se o valor é aceito). Os dois são coisas
 * diferentes: uma sequência pode ter o formato certo (11 ou 14 dígitos) e
 * ainda ser inválida (dígitos verificadores errados, ou tudo repetido tipo
 * "111.111.111-11", que passa em qualquer regex de formato).
 *
 * Padrão para novos campos com formato fixo (documento, telefone, CEP…):
 * uma função `formatarX` para o que o usuário vê durante a digitação e uma
 * `validarX` para o zod — nunca confiar só no `maxLength`/regex de forma.
 */

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Digita "11222333000181" → mostra "11.222.333/0001-81" progressivamente. */
export function formatarCnpj(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Digita "11122233344" → mostra "111.222.333-44" progressivamente. */
export function formatarCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Detecta pela quantidade de dígitos qual dos dois o usuário está digitando. */
export function formatarDocumento(valor: string): string {
  const d = apenasDigitos(valor);
  return d.length > 11 ? formatarCnpj(valor) : formatarCpf(valor);
}

function validarSequenciaRepetida(d: string): boolean {
  return /^(\d)\1*$/.test(d);
}

/** Algoritmo oficial dos dois dígitos verificadores do CPF. */
export function validarCpf(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 11 || validarSequenciaRepetida(d)) return false;

  for (const posicao of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < posicao; i++) soma += Number(d[i]) * (posicao + 1 - i);
    const resto = (soma * 10) % 11;
    const digito = resto === 10 ? 0 : resto;
    if (digito !== Number(d[posicao])) return false;
  }
  return true;
}

/** Algoritmo oficial dos dois dígitos verificadores do CNPJ. */
export function validarCnpj(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 14 || validarSequenciaRepetida(d)) return false;

  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const posicao of [12, 13]) {
    const pesosAtivos = pesos.slice(pesos.length - posicao);
    let soma = 0;
    for (let i = 0; i < posicao; i++) soma += Number(d[i]) * pesosAtivos[i];
    const resto = soma % 11;
    const digito = resto < 2 ? 0 : 11 - resto;
    if (digito !== Number(d[posicao])) return false;
  }
  return true;
}

/** Aceita CPF (11 dígitos) ou CNPJ (14) — caso do campo único de contato. */
export function validarDocumento(valor: string): boolean {
  const d = apenasDigitos(valor);
  return d.length === 11 ? validarCpf(valor) : d.length === 14 ? validarCnpj(valor) : false;
}
