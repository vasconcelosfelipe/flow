"use client";

import { Building2, Calendar, CreditCard, FileText, Tag, Users } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/dates";
import { iconeDe } from "@/lib/icones";
import { ROTULO_STATUS } from "@/types/dominio";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

/**
 * Detalhe de uma movimentação, em folha (celular) ou diálogo (desktop) via
 * `ResponsiveModal` — um único contrato para as duas apresentações.
 *
 * O protótipo lê de `MovimentacaoResumo` (o que a lista já tem em mãos) em
 * vez de buscar `MovimentacaoDetalhe`: mostra o que existe, sem fingir campos
 * que a Fase 2 ainda vai popular (observação, forma de pagamento real, etc.).
 */
export function DetalheMovimentacaoSheet({
  movimentacao,
  aoFechar,
}: {
  movimentacao: MovimentacaoResumo | null;
  aoFechar: () => void;
}) {
  if (!movimentacao) return null;

  const Icone = movimentacao.categoria ? iconeDe(movimentacao.categoria.icone) : Tag;
  const receita = movimentacao.tipo === "RECEITA";

  return (
    <ResponsiveModal
      aberto={!!movimentacao}
      aoMudarAberto={(aberto) => !aberto && aoFechar()}
      titulo={movimentacao.descricao}
      descricao="Detalhes da movimentação selecionada."
      rodape={
        <>
          <Button variant="outline" className="flex-1" onClick={aoFechar}>
            Fechar
          </Button>
          <Button className="flex-1">Editar</Button>
        </>
      }
    >
      <div className="space-y-5 py-2">
        <div className="flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl"
            style={
              movimentacao.categoria
                ? { backgroundColor: `${movimentacao.categoria.cor}1a`, color: movimentacao.categoria.cor }
                : { backgroundColor: "var(--attention-wash)", color: "var(--attention-text)" }
            }
          >
            <Icone className="size-5" aria-hidden="true" />
          </span>
          <div>
            <AmountText
              centavos={receita ? movimentacao.valorCentavos : -movimentacao.valorCentavos}
              tamanho="lg"
            />
            <p className="text-micro text-ink-muted">
              {movimentacao.categoria?.nome ?? "Sem categoria"}
            </p>
          </div>
        </div>

        <dl className="space-y-3">
          <LinhaDetalhe
            icone={Calendar}
            rotulo="Data"
            valor={
              movimentacao.data
                ? formatarData(movimentacao.data)
                : movimentacao.dataVencimento
                  ? `Vence em ${formatarData(movimentacao.dataVencimento)}`
                  : "—"
            }
          />
          <LinhaDetalhe icone={CreditCard} rotulo="Conta" valor={movimentacao.conta.nome} />
          {movimentacao.contato && (
            <LinhaDetalhe icone={Users} rotulo="Contato" valor={movimentacao.contato.nome} />
          )}
          <LinhaDetalhe icone={FileText} rotulo="Status" valor={ROTULO_STATUS[movimentacao.status]} />
          {movimentacao.totalParcelas && (
            <LinhaDetalhe
              icone={Building2}
              rotulo="Parcela"
              valor={`${movimentacao.numeroParcela} de ${movimentacao.totalParcelas}`}
            />
          )}
        </dl>
      </div>
    </ResponsiveModal>
  );
}

function LinhaDetalhe({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: typeof Calendar;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <Icone className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <dt className="w-24 shrink-0 text-micro text-ink-muted">{rotulo}</dt>
      <dd className="text-corpo font-medium text-ink">{valor}</dd>
    </div>
  );
}
