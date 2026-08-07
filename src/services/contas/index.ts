import { db } from "@/lib/db";
import type { ContaCompleta } from "@/services/contas/dto";

export async function listarContas(empresaId: string): Promise<ContaCompleta[]> {
  const contas = await db.conta.findMany({
    where: { empresaId, ativa: true },
    include: {
      _count: { select: { movimentacoes: true } },
      movimentacoes: {
        where: { status: { in: ["PAGO", "CONCILIADO"] } },
        select: { tipo: true, valorCentavos: true },
      },
    },
    orderBy: { criadoEm: "asc" },
  });

  return contas.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: c.cor,
    tipo: c.tipo,
    saldoInicialCentavos: c.saldoInicial,
    saldoCentavos:
      c.saldoInicial +
      c.movimentacoes.reduce(
        (sum, m) => sum + (m.tipo === "RECEITA" ? m.valorCentavos : -m.valorCentavos),
        0,
      ),
    quantidadeMovimentacoes: c._count.movimentacoes,
    diaFechamento: c.diaFechamento,
    diaVencimentoFatura: c.diaVencimentoFatura,
  }));
}

/** Uma conta específica, com o mesmo saldo calculado de `listarContas` —
 * usado pela tela de fatura do cartão. */
export async function obterConta(empresaId: string, id: string): Promise<ContaCompleta | null> {
  const conta = await db.conta.findFirst({
    where: { id, empresaId, ativa: true },
    include: {
      _count: { select: { movimentacoes: true } },
      movimentacoes: {
        where: { status: { in: ["PAGO", "CONCILIADO"] } },
        select: { tipo: true, valorCentavos: true },
      },
    },
  });
  if (!conta) return null;

  return {
    id: conta.id,
    nome: conta.nome,
    cor: conta.cor,
    tipo: conta.tipo,
    saldoInicialCentavos: conta.saldoInicial,
    saldoCentavos:
      conta.saldoInicial +
      conta.movimentacoes.reduce(
        (sum, m) => sum + (m.tipo === "RECEITA" ? m.valorCentavos : -m.valorCentavos),
        0,
      ),
    quantidadeMovimentacoes: conta._count.movimentacoes,
    diaFechamento: conta.diaFechamento,
    diaVencimentoFatura: conta.diaVencimentoFatura,
  };
}
