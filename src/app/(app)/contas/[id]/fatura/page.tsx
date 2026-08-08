import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { BotaoNovaCompraCartao } from "@/features/contas/nova-compra-cartao";
import { ListaFaturaCartao } from "@/features/contas/lista-fatura-cartao";
import { calcularVencimentoFatura, formatarData, formatarMesAno } from "@/lib/dates";
import { requireSessao } from "@/lib/sessao";
import { listarCategorias } from "@/services/categorias";
import { obterConta } from "@/services/contas";
import { listarContatos } from "@/services/contatos";
import { listarLinhasDre } from "@/services/linhas-dre";
import { listarFaturaCartao } from "@/services/movimentacoes";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vencimento?: string }>;
};

/** Anda um ciclo inteiro pra trás/frente mantendo o dia de vencimento —
 * cada fatura vence sempre no mesmo dia do mês, só muda o mês. */
function deslocarCiclo(vencimento: Date, quantidade: number): Date {
  return new Date(
    Date.UTC(vencimento.getUTCFullYear(), vencimento.getUTCMonth() + quantidade, vencimento.getUTCDate()),
  );
}

function chaveData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export default async function FaturaCartaoPage({ params, searchParams }: Props) {
  const [{ id }, sp, { empresaAtiva }] = await Promise.all([params, searchParams, requireSessao()]);

  const conta = await obterConta(empresaAtiva.id, id);
  if (!conta || conta.tipo !== "CARTAO") notFound();

  // Sem fechamento/vencimento configurado, não tem como calcular ciclo —
  // manda arrumar isso primeiro em vez de mostrar uma fatura errada.
  if (!conta.diaFechamento || !conta.diaVencimentoFatura) {
    return (
      <Container className="space-y-4 pt-5">
        <Link
          href="/contas"
          className="inline-flex items-center gap-1 text-micro font-medium text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Contas
        </Link>
        <EmptyState
          icone={CreditCard}
          titulo="Falta configurar o cartão"
          descricao="Defina o dia de fechamento e de vencimento da fatura na edição desta conta antes de ver o ciclo."
        />
      </Container>
    );
  }

  const vencimento = sp.vencimento
    ? new Date(`${sp.vencimento}T00:00:00.000Z`)
    : calcularVencimentoFatura(new Date(), conta.diaFechamento, conta.diaVencimentoFatura);

  const [itens, categorias, contatos, linhas] = await Promise.all([
    listarFaturaCartao(empresaAtiva.id, id, vencimento),
    listarCategorias(empresaAtiva.id),
    listarContatos(empresaAtiva.id),
    listarLinhasDre(),
  ]);
  const totalCentavos = itens.reduce(
    (soma, m) => soma + (m.tipo === "RECEITA" ? -m.valorCentavos : m.valorCentavos),
    0,
  );

  const vencimentoAnterior = deslocarCiclo(vencimento, -1);
  const vencimentoProximo = deslocarCiclo(vencimento, 1);

  return (
    <Container className="space-y-4 pt-5">
      <Link
        href="/contas"
        className="inline-flex items-center gap-1 text-micro font-medium text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Contas
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-titulo font-semibold text-ink">{conta.nome}</h1>
          <p className="text-micro text-ink-muted">
            Saldo devedor atual:{" "}
            <AmountText centavos={conta.saldoCentavos} tamanho="sm" tom="auto" className="inline" />
          </p>
        </div>
        <BotaoNovaCompraCartao
          contaId={conta.id}
          contaNome={conta.nome}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
        />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-card">
        <Link
          href={`/contas/${id}/fatura?vencimento=${chaveData(vencimentoAnterior)}`}
          aria-label="Fatura anterior"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-muted"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>

        <div className="text-center">
          <p className="text-nano font-medium tracking-wide text-ink-muted uppercase">
            Fatura de {formatarMesAno(vencimento)}
          </p>
          <p className="mt-0.5 text-micro text-ink-muted">Vence em {formatarData(vencimento)}</p>
          <AmountText
            centavos={totalCentavos}
            tamanho="lg"
            tom={totalCentavos > 0 ? "negativo" : "neutro"}
            className="mt-1 block"
          />
        </div>

        <Link
          href={`/contas/${id}/fatura?vencimento=${chaveData(vencimentoProximo)}`}
          aria-label="Próxima fatura"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-muted"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <ListaFaturaCartao
        itens={itens}
        contaId={conta.id}
        contaNome={conta.nome}
        categorias={categorias}
        contatos={contatos}
        linhas={linhas}
      />
    </Container>
  );
}
