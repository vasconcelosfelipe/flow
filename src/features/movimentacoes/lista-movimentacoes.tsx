"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Receipt } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { EmptyState } from "@/components/shared/empty-state";
import { TransactionRow } from "@/components/shared/transaction-row";
import { Button } from "@/components/ui/button";
import { DetalheMovimentacaoSheet } from "@/features/movimentacoes/detalhe-sheet";
import { buscarMaisMovimentacoes } from "@/services/movimentacoes/actions";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { FiltroMovimentacoes, GrupoDiario } from "@/services/movimentacoes/dto";
import type { TipoEmpresa } from "@/types/dominio";

type OpcaoConta = { id: string; nome: string };

/** Junta a próxima página aos grupos já carregados — o único dia que pode se
 * repetir entre páginas é a borda (último grupo da página anterior = primeiro
 * da nova), já que a ordenação é sempre decrescente por data. */
function mesclarGrupos(atuais: GrupoDiario[], novos: GrupoDiario[]): GrupoDiario[] {
  if (atuais.length === 0) return novos;
  if (novos.length === 0) return atuais;
  const ultimo = atuais[atuais.length - 1];
  const primeiro = novos[0];
  if (ultimo.chave === primeiro.chave) {
    const mesclado: GrupoDiario = {
      ...ultimo,
      itens: [...ultimo.itens, ...primeiro.itens],
      totalCentavos: ultimo.totalCentavos + primeiro.totalCentavos,
      totalRealizadoCentavos: ultimo.totalRealizadoCentavos + primeiro.totalRealizadoCentavos,
    };
    return [...atuais.slice(0, -1), mesclado, ...novos.slice(1)];
  }
  return [...atuais, ...novos];
}

/**
 * Cabeçalho de grupo e linhas — client component porque acumula páginas do
 * "Carregar mais" em memória, algo que não cabe na URL nem no servidor.
 */
export function ListaMovimentacoes({
  grupos: gruposIniciais,
  proximoCursor: proximoCursorInicial = null,
  saldoContaAncora = null,
  filtro,
  contas = [],
  categorias = [],
  contatos = [],
  linhas = [],
  tipoEspaco,
  somenteLeitura = false,
}: {
  grupos: GrupoDiario[];
  proximoCursor?: string | null;
  /** Saldo real da conta (só quando `filtro.contaId` está setado) — âncora
   * pro saldo acumulado exibido no cabeçalho de cada dia. */
  saldoContaAncora?: number | null;
  filtro: FiltroMovimentacoes;
  contas?: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  somenteLeitura?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [grupos, setGrupos] = useState(gruposIniciais);
  const [proximoCursor, setProximoCursor] = useState(proximoCursorInicial);

  // Qualquer mutação (editar, excluir, desfazer conciliação...) chama
  // router.refresh() no servidor, que busca `gruposIniciais` de novo — mas
  // sem isto, o estado local (que existe pra acumular o "Carregar mais")
  // nunca lê o dado novo, e a tela (inclusive o detalhe aberto) fica presa
  // no valor de antes da mutação até a página ser recarregada na mão.
  useEffect(() => {
    setGrupos(gruposIniciais);
    setProximoCursor(proximoCursorInicial);
  }, [gruposIniciais, proximoCursorInicial]);

  const todosOsItens = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);

  // Saldo acumulado até o fim de cada dia — só existe com uma conta
  // filtrada (sem isso, misturar contas diferentes não tem um saldo só que
  // faça sentido). Ordem dos grupos é sempre decrescente (mais recente
  // primeiro), então o saldo do primeiro grupo já É o saldo atual da conta;
  // cada grupo mais antigo desconta o líquido realizado do grupo anterior.
  const saldosPorGrupo = useMemo(() => {
    if (saldoContaAncora === null) return null;
    const saldos: number[] = [];
    let corrente = saldoContaAncora;
    grupos.forEach((grupo, i) => {
      if (i > 0) corrente -= grupos[i - 1].totalRealizadoCentavos;
      saldos.push(corrente);
    });
    return saldos;
  }, [grupos, saldoContaAncora]);

  function carregarMais() {
    if (!proximoCursor || carregandoMais) return;
    setCarregandoMais(true);
    startTransition(async () => {
      const pagina = await buscarMaisMovimentacoes(filtro, proximoCursor);
      setGrupos((atuais) => mesclarGrupos(atuais, pagina.grupos));
      setProximoCursor(pagina.proximoCursor);
      setCarregandoMais(false);
    });
  }

  if (grupos.length === 0) {
    return (
      <EmptyState
        icone={Receipt}
        titulo="Nenhuma movimentação encontrada"
        descricao="Tente ajustar os filtros ou importar um novo extrato."
        acao={{ rotulo: "Importar extrato", href: "/importar" }}
      />
    );
  }

  return (
    <div className="pb-20">
      <div className="space-y-5">
        {grupos.map((grupo, i) => (
          <section key={grupo.chave}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h2 className="text-micro font-medium text-ink-muted">{grupo.rotulo}</h2>
              {saldosPorGrupo && (
                <AmountText centavos={saldosPorGrupo[i]} tamanho="sm" tom="neutro" />
              )}
            </div>

            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              {grupo.itens.map((mov) => (
                <TransactionRow key={mov.id} movimentacao={mov} aoAbrir={setAbertoId} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {proximoCursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={carregarMais} disabled={carregandoMais}>
            {carregandoMais ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}

      {abertoId && (
        <DetalheMovimentacaoSheet
          movimentacao={todosOsItens.find((m) => m.id === abertoId) ?? null}
          contas={contas}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
          tipoEspaco={tipoEspaco}
          aoFechar={() => setAbertoId(null)}
          somenteLeitura={somenteLeitura}
        />
      )}
    </div>
  );
}
