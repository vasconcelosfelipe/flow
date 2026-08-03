"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Receipt, Tags, X } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { EmptyState } from "@/components/shared/empty-state";
import { TransactionRow } from "@/components/shared/transaction-row";
import { Button } from "@/components/ui/button";
import { DetalheMovimentacaoSheet } from "@/features/movimentacoes/detalhe-sheet";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { atualizarCategoriaEmLote, buscarMaisMovimentacoes } from "@/services/movimentacoes/actions";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { FiltroMovimentacoes, GrupoDiario } from "@/services/movimentacoes/dto";

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
 * Cabeçalho de grupo, linhas, e o modo de seleção múltipla — tudo num único
 * client component porque a seleção é estado efêmero de tela, sem razão para
 * viver na URL nem no servidor.
 */
export function ListaMovimentacoes({
  grupos: gruposIniciais,
  proximoCursor: proximoCursorInicial = null,
  saldoContaAncora = null,
  filtro,
  contas = [],
  categorias: categoriasIniciais = [],
  contatos = [],
  linhas = [],
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
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [categorizando, setCategorizando] = useState(false);
  const [categorias, setCategorias] = useState(categoriasIniciais);
  // Sem sincronizar via efeito: a página troca a `key` deste componente
  // (ver movimentacoes/page.tsx) toda vez que o filtro muda, o que remonta o
  // componente do zero com os dados novos em vez de arriscar ficar preso na
  // página antiga acumulada pelo "Carregar mais".
  const [grupos, setGrupos] = useState(gruposIniciais);
  const [proximoCursor, setProximoCursor] = useState(proximoCursorInicial);

  const todosOsItens = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);
  const emSelecao = modoSelecao;

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

  function sairDoModoSelecao() {
    setModoSelecao(false);
    setSelecionados(new Set());
  }

  function categorizarSelecionadas(categoriaId: string) {
    startTransition(async () => {
      await atualizarCategoriaEmLote([...selecionados], categoriaId);
      setCategorizando(false);
      sairDoModoSelecao();
      router.refresh();
    });
  }

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
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
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => (emSelecao ? sairDoModoSelecao() : setModoSelecao(true))}
          className="rounded-lg px-2 py-1 text-micro font-medium text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          {emSelecao ? "Cancelar" : "Selecionar"}
        </button>
      </div>

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
                <TransactionRow
                  key={mov.id}
                  movimentacao={mov}
                  aoAbrir={emSelecao ? undefined : setAbertoId}
                  selecionada={emSelecao ? selecionados.has(mov.id) : undefined}
                  aoAlternarSelecao={emSelecao ? alternarSelecao : undefined}
                />
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

      {emSelecao && selecionados.size > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-4 md:bottom-6 md:left-20">
          <div className="mx-auto flex max-w-[1180px] items-center gap-3 rounded-2xl bg-night px-4 py-3 text-night-text shadow-raised">
            <button
              type="button"
              onClick={sairDoModoSelecao}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-night-muted hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Cancelar seleção</span>
            </button>

            <p className="flex-1 text-micro font-medium">
              {selecionados.size} {selecionados.size === 1 ? "selecionada" : "selecionadas"}
            </p>

            <Button
              size="sm"
              className="gap-1.5 bg-brand hover:bg-brand-hover"
              onClick={() => setCategorizando(true)}
            >
              <Tags className="size-4" aria-hidden="true" />
              Categorizar
            </Button>
          </div>
        </div>
      )}

      {abertoId && (
        <DetalheMovimentacaoSheet
          movimentacao={todosOsItens.find((m) => m.id === abertoId) ?? null}
          contas={contas}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
          aoFechar={() => setAbertoId(null)}
        />
      )}

      {categorizando && (
        <SeletorCategoriaContatoModal
          tipo="categoria"
          aberto
          aoMudarAberto={setCategorizando}
          value=""
          onValueChange={categorizarSelecionadas}
          opcoes={categorias.map((c) => ({ value: c.id, label: c.nome }))}
          categorias={categorias}
          linhas={linhas}
          aoCriar={(categoria) => setCategorias((atual) => [...atual, categoria])}
        />
      )}
    </div>
  );
}
