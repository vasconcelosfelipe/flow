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
  }));
}
