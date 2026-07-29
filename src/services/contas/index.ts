import { CONTAS_MOCK, MOVIMENTACOES_MOCK } from "@/lib/mock/dados";
import type { ContaCompleta } from "@/services/contas/dto";

/**
 * Fase 1: soma sobre `lib/mock`. Fase 2: o saldo vem de uma consulta
 * agregada no Prisma (ou de uma coluna materializada) — a tela não muda.
 */

const CONCILIADO = ["CONCILIADO", "PAGO"] as const;

export function listarContas(): ContaCompleta[] {
  return CONTAS_MOCK.map((c) => {
    const doConta = MOVIMENTACOES_MOCK.filter((m) => m.conta.id === c.id);
    const realizadas = doConta.filter((m) =>
      CONCILIADO.includes(m.status as (typeof CONCILIADO)[number]),
    );

    const saldoCentavos = realizadas.reduce(
      (soma, m) => soma + (m.tipo === "RECEITA" ? m.valorCentavos : -m.valorCentavos),
      0,
    );

    return {
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      tipo: c.tipo,
      saldoCentavos,
      quantidadeMovimentacoes: doConta.length,
    };
  });
}
