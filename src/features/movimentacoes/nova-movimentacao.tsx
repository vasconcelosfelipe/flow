"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { ArrowLeftRight, ChevronRight, CreditCard, Landmark, Plus, Upload, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { FormularioCompraCartao } from "@/features/contas/formulario-compra-cartao";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { useNovoLancamento } from "@/components/layout/novo-lancamento-provider";
import { dividirEmParcelas, formatarValor, parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import { criarMovimentacao, criarPendencia, criarTransferencia } from "@/services/movimentacoes/actions";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoConta, TipoEmpresa } from "@/types/dominio";

export type OpcaoConta = { id: string; nome: string; tipo?: TipoConta };
type TipoLancamento = "DESPESA" | "RECEITA" | "TRANSFERENCIA";
type Modalidade = "UNICA" | "PARCELADO" | "RECORRENTE";

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";
const FORM_ID = "form-nova-movimentacao";
const FORM_ID_CARTAO = "form-nova-movimentacao-cartao";

const TIPOS: { valor: TipoLancamento; rotulo: string }[] = [
  { valor: "DESPESA", rotulo: "Despesa" },
  { valor: "RECEITA", rotulo: "Receita" },
  { valor: "TRANSFERENCIA", rotulo: "Transferência" },
];

const ROTULO_STATUS_LANCAMENTO: Record<"PAGO" | "PENDENTE" | "CONCILIADO", string> = {
  PAGO: "Pago",
  PENDENTE: "Pendente",
  CONCILIADO: "Conciliado",
};

const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  UNICA: "Única",
  PARCELADO: "Parcelado",
  RECORRENTE: "Recorrente",
};

/** Dados de partida pra "Duplicar movimentação" (ver `detalhe-sheet.tsx`) —
 * sempre nasce como lançamento único de hoje, nunca copia parcelamento nem
 * status/data da origem. */
export type PrefillMovimentacao = {
  descricao: string;
  tipo: "RECEITA" | "DESPESA";
  valorCentavos: number;
  contaId: string;
  ehCartao: boolean;
  categoriaId: string | null;
  contatoId: string | null;
};

/**
 * Botão-gatilho da tela de Movimentações — o modal em si (`ModalNovaMovimentacao`)
 * vive uma única vez no layout raiz (ver `NovoLancamentoProvider`), acionado
 * por este botão OU pelo "+" da navegação, de qualquer tela do app.
 */
export function BotaoNovaMovimentacao({ somenteLeitura = false }: { somenteLeitura?: boolean }) {
  const { abrir } = useNovoLancamento();

  if (somenteLeitura) return null;

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" asChild>
        <Link href="/importar">
          <Upload className="size-4" aria-hidden="true" />
          Importar OFX
        </Link>
      </Button>
      <Button size="sm" className="gap-1.5" onClick={() => abrir()}>
        <Plus className="size-4" aria-hidden="true" />
        Nova
      </Button>
    </div>
  );
}

/**
 * Modal de novo lançamento — débito em conta (à vista, parcelado ou
 * recorrente) ou compra no cartão. Controlado (`aberto`/`aoMudarAberto`),
 * montado uma vez no layout raiz.
 *
 * Débito em conta única chama `criarMovimentacao` (aceita Pago/Pendente/
 * Conciliado, nasce com `data` ocorrida). Parcelado/Recorrente chamam
 * `criarPendencia` — mesma action do cartão, sempre nasce PENDENTE, sem
 * seletor de status (não faz sentido "pagar" uma série inteira de uma vez).
 */
export function ModalNovaMovimentacao({
  aberto,
  aoMudarAberto,
  contas,
  categorias: categoriasIniciais = [],
  contatos: contatosIniciais = [],
  linhas = [],
  tipoEspaco,
  prefill = null,
}: {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  contas: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  /** Preenche o formulário ao abrir — "Duplicar movimentação" no detalhe.
   * O modal fica montado o tempo todo (nunca desmonta sozinho), então só um
   * `useState` inicial não bastaria: o efeito abaixo reaplica os valores
   * toda vez que `aberto` vira `true`. */
  prefill?: PrefillMovimentacao | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingCartao, setPendingCartao] = useState(false);
  // "Nova" abre nesta escolha antes de qualquer formulário — débito em
  // conta e compra no cartão são fluxos diferentes o bastante (parcelamento,
  // sem status, fatura calculada) pra não caber escondidos atrás de um
  // seletor de tipo de conta comum.
  const [modo, setModo] = useState<"escolha" | "debito" | "cartao">("escolha");
  const [modalAberto, setModalAberto] = useState<
    "categoria" | "contato" | "contaOrigem" | "contaDestino" | "status" | "conta" | null
  >(null);
  // Categoria/fornecedor criados na hora entram aqui pra ficarem selecionáveis
  // sem precisar recarregar a página.
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [contatos, setContatos] = useState(contatosIniciais);

  // Cartão não é "de onde sai dinheiro" — só entra como conta de destino de
  // uma transferência (é assim que se paga a fatura). Lançamento comum
  // (despesa/receita) nunca lista conta de cartão.
  const contasNaoCartao = contas.filter((c) => c.tipo !== "CARTAO");
  const contasCartao = contas.filter((c) => c.tipo === "CARTAO");

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoLancamento>("DESPESA");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"PAGO" | "PENDENTE" | "CONCILIADO">("PAGO");
  const [contaId, setContaId] = useState(contasNaoCartao[0]?.id ?? "");
  const [contaDestinoId, setContaDestinoId] = useState(contas[1]?.id ?? contas[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState(SEM_CATEGORIA);
  const [contatoId, setContatoId] = useState(SEM_FORNECEDOR);
  const [erroTransferencia, setErroTransferencia] = useState<string | null>(null);

  const [modalidade, setModalidade] = useState<Modalidade>("UNICA");
  const [numeroParcelas, setNumeroParcelas] = useState("2");
  const [parcelas, setParcelas] = useState<string[]>([]);
  const [quantidadeMeses, setQuantidadeMeses] = useState("2");

  const transferencia = tipo === "TRANSFERENCIA";
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId);
  const contatoSelecionado = contatos.find((c) => c.id === contatoId);

  useEffect(() => {
    if (categoriaId === SEM_CATEGORIA) return;
    if (!categoriasDoTipo.some((c) => c.id === categoriaId)) setCategoriaId(SEM_CATEGORIA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  // Sair do modo transferência com um cartão selecionado como origem (só
  // permitido ali) deixaria a Conta de despesa/receita com um valor que não
  // está mais entre as opções — volta pra primeira conta válida.
  useEffect(() => {
    if (transferencia) return;
    if (!contasNaoCartao.some((c) => c.id === contaId)) setContaId(contasNaoCartao[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferencia]);

  // Preenche com os dados da movimentação duplicada sempre que o modal abre
  // com um `prefill` — a data nasce hoje, nunca a da origem, e o status
  // volta a Pago (é um lançamento novo, não uma cópia do estado antigo).
  useEffect(() => {
    if (!aberto || !prefill) return;
    setModo(prefill.ehCartao ? "cartao" : "debito");
    setDescricao(prefill.descricao);
    setValor((prefill.valorCentavos / 100).toFixed(2).replace(".", ","));
    setTipo(prefill.tipo);
    setData(new Date().toISOString().slice(0, 10));
    setStatus("PAGO");
    setContaId(prefill.ehCartao ? (contasNaoCartao[0]?.id ?? "") : prefill.contaId);
    setCategoriaId(prefill.categoriaId ?? SEM_CATEGORIA);
    setContatoId(prefill.contatoId ?? SEM_FORNECEDOR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function resetar() {
    setModo("escolha");
    setDescricao("");
    setValor("");
    setErroValor(null);
    setErroTransferencia(null);
    setTipo("DESPESA");
    setData(new Date().toISOString().slice(0, 10));
    setStatus("PAGO");
    setContaId(contasNaoCartao[0]?.id ?? "");
    setContaDestinoId(contas[1]?.id ?? contas[0]?.id ?? "");
    setCategoriaId(SEM_CATEGORIA);
    setContatoId(SEM_FORNECEDOR);
    setModalidade("UNICA");
    setNumeroParcelas("2");
    setParcelas([]);
    setQuantidadeMeses("2");
  }

  // Recalcula a divisão igual das parcelas a partir do valor total e da
  // quantidade — só dispara quando a pessoa mexe num dos dois campos-fonte,
  // nunca sozinho, porque a edição manual de uma parcela é permanente até o
  // próximo recálculo explícito.
  function dividirParcelasIgualmente(valorTexto = valor, quantidadeTexto = numeroParcelas) {
    const total = parseMoeda(valorTexto) ?? 0;
    const quantidade = Math.max(2, Math.min(360, Number(quantidadeTexto) || 2));
    setParcelas(dividirEmParcelas(total, quantidade).map((c) => formatarValor(c)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (transferencia) {
      const centavos = parseMoeda(valor);
      if (!centavos || centavos <= 0) {
        setErroValor("Digite um valor válido.");
        return;
      }
      if (!contaId) return;
      if (contaId === contaDestinoId) {
        setErroTransferencia("Escolha duas contas diferentes.");
        return;
      }
      startTransition(async () => {
        await criarTransferencia({
          contaOrigemId: contaId,
          contaDestinoId,
          valorCentavos: centavos,
          data,
          descricao: descricao || undefined,
        });
        aoMudarAberto(false);
        resetar();
        router.refresh();
      });
      return;
    }

    if (!contaId) return;
    const camposComuns = {
      descricao,
      tipo: tipo as "RECEITA" | "DESPESA",
      contaId,
      categoriaId: categoriaId === SEM_CATEGORIA ? null : categoriaId,
      contatoId: contatoId === SEM_FORNECEDOR ? null : contatoId,
    };

    if (modalidade === "UNICA") {
      const centavos = parseMoeda(valor);
      if (!centavos || centavos <= 0) {
        setErroValor("Digite um valor válido.");
        return;
      }
      startTransition(async () => {
        await criarMovimentacao({ ...camposComuns, valorCentavos: centavos, status, data });
        aoMudarAberto(false);
        resetar();
        router.refresh();
      });
      return;
    }

    if (modalidade === "PARCELADO") {
      const valoresParcelas = parcelas.map((p) => parseMoeda(p) ?? 0);
      if (valoresParcelas.length < 2 || valoresParcelas.some((c) => c <= 0)) {
        setErroValor("Confira o valor de cada parcela.");
        return;
      }
      startTransition(async () => {
        await criarPendencia({
          ...camposComuns,
          modalidade: "PARCELADO",
          parcelas: valoresParcelas,
          dataVencimento: data,
        });
        aoMudarAberto(false);
        resetar();
        router.refresh();
      });
      return;
    }

    const centavos = parseMoeda(valor);
    if (!centavos || centavos <= 0) {
      setErroValor("Digite um valor válido.");
      return;
    }
    const meses = Math.max(2, Math.min(360, Number(quantidadeMeses) || 2));
    startTransition(async () => {
      await criarPendencia({
        ...camposComuns,
        modalidade: "RECORRENTE",
        valorCentavos: centavos,
        quantidadeMeses: meses,
        dataVencimento: data,
      });
      aoMudarAberto(false);
      resetar();
      router.refresh();
    });
  }

  return (
    <>
      <ResponsiveModal
        aberto={aberto}
        aoMudarAberto={(v) => { aoMudarAberto(v); if (!v) resetar(); }}
        titulo={modo === "cartao" ? "Nova compra no cartão" : "Nova movimentação"}
        descricao={
          modo === "escolha"
            ? "Como você quer registrar?"
            : modo === "cartao"
              ? "A fatura em que a compra cai é calculada sozinha."
              : "Registre uma entrada, saída ou transferência entre contas."
        }
        rodape={
          modo === "escolha" ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => { aoMudarAberto(false); resetar(); }}
            >
              Cancelar
            </Button>
          ) : modo === "cartao" ? (
            <>
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setModo("escolha")}>
                Voltar
              </Button>
              <Button type="submit" form={FORM_ID_CARTAO} size="lg" className="flex-1" disabled={pendingCartao}>
                {pendingCartao ? "Salvando…" : "Salvar"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => (contasCartao.length === 0 ? (aoMudarAberto(false), resetar()) : setModo("escolha"))}
              >
                {contasCartao.length === 0 ? "Cancelar" : "Voltar"}
              </Button>
              <Button type="submit" form={FORM_ID} size="lg" className="flex-1" disabled={pending || !contaId}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </>
          )
        }
      >
        {modo === "escolha" && (
          <div className="space-y-3 py-2">
            <button
              type="button"
              onClick={() => setModo("debito")}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-brand-wash/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
                <Landmark className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">Débito/Crédito em conta</span>
                <span className="block text-micro text-ink-muted">
                  Entrada ou saída numa conta corrente, poupança, caixa ou investimento —
                  à vista, parcelada ou recorrente.
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => contasCartao.length > 0 && setModo("cartao")}
              disabled={contasCartao.length === 0}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-brand-wash/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-surface"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
                <CreditCard className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">Cartão de crédito</span>
                <span className="block text-micro text-ink-muted">
                  {contasCartao.length === 0
                    ? "Cadastre um cartão em Contas primeiro."
                    : "Compra no cartão, à vista ou parcelada."}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
            </button>
          </div>
        )}

        {modo === "cartao" && (
          <FormularioCompraCartao
            formId={FORM_ID_CARTAO}
            contas={contasCartao}
            categorias={categorias}
            contatos={contatos}
            linhas={linhas}
            tipoEspaco={tipoEspaco}
            prefill={prefill?.ehCartao ? prefill : null}
            aoPendingChange={setPendingCartao}
            aoSalvar={() => {
              aoMudarAberto(false);
              resetar();
              router.refresh();
            }}
          />
        )}

        {modo === "debito" && (
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 py-2">
          {(transferencia || modalidade !== "PARCELADO") && (
            <div className="space-y-1.5">
              <Label htmlFor="nov-valor">
                {!transferencia && modalidade === "RECORRENTE" ? "Valor de cada ocorrência (R$)" : "Valor (R$)"}
              </Label>
              <Input
                id="nov-valor"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setErroValor(null);
                }}
                className="h-11"
                required
              />
              {erroValor && <p className="text-nano text-negative-text">{erroValor}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="nov-descricao">Descrição{transferencia && " (opcional)"}</Label>
            <div className="relative">
              <Input
                id="nov-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={transferencia ? "Ex: Reforço de caixa" : "Ex: Aluguel de equipamento"}
                className="h-11 pr-9"
                required={!transferencia}
              />
              {descricao && (
                <button
                  type="button"
                  onClick={() => setDescricao("")}
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-muted"
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">Limpar descrição</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTipo(t.valor)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-1 rounded-lg border text-micro font-medium transition-colors",
                    tipo === t.valor
                      ? t.valor === "RECEITA"
                        ? "border-positive bg-positive-wash text-positive-text"
                        : t.valor === "DESPESA"
                          ? "border-negative bg-negative-wash text-negative-text"
                          : "border-brand bg-brand-wash text-brand"
                      : "border-line text-ink-muted hover:bg-muted",
                  )}
                >
                  {t.valor === "TRANSFERENCIA" && <ArrowLeftRight className="size-3.5" aria-hidden="true" />}
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>

          {transferencia ? (
            <>
              <div className="space-y-1.5">
                <Label>Conta de origem</Label>
                <GatilhoSelecao
                  label={contas.find((c) => c.id === contaId)?.nome ?? null}
                  placeholder="Escolher conta"
                  onClick={() => setModalAberto("contaOrigem")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Conta de destino</Label>
                <GatilhoSelecao
                  label={contas.find((c) => c.id === contaDestinoId)?.nome ?? null}
                  placeholder="Escolher conta"
                  onClick={() => setModalAberto("contaDestino")}
                />
                {erroTransferencia && (
                  <p className="text-nano text-negative-text">{erroTransferencia}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nov-data">Data</Label>
                <Input
                  id="nov-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Ocorrência</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["UNICA", "PARCELADO", "RECORRENTE"] as const).map((valorModalidade) => (
                    <button
                      key={valorModalidade}
                      type="button"
                      onClick={() => {
                        setModalidade(valorModalidade);
                        setErroValor(null);
                        if (valorModalidade === "PARCELADO") dividirParcelasIgualmente();
                      }}
                      className={cn(
                        "h-11 rounded-lg border text-micro font-medium transition-colors",
                        modalidade === valorModalidade
                          ? "border-brand bg-brand-wash text-brand"
                          : "border-line text-ink-muted hover:bg-muted",
                      )}
                    >
                      {ROTULO_MODALIDADE[valorModalidade]}
                    </button>
                  ))}
                </div>
              </div>

              {modalidade === "PARCELADO" && (
                <div className="space-y-3 rounded-2xl border border-line bg-muted/40 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nov-valor-total">Valor total (R$)</Label>
                    <Input
                      id="nov-valor-total"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valor}
                      onChange={(e) => {
                        setValor(e.target.value);
                        setErroValor(null);
                      }}
                      onBlur={() => dividirParcelasIgualmente()}
                      className="h-11 bg-surface"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nov-num-parcelas">Número de parcelas</Label>
                    <Input
                      id="nov-num-parcelas"
                      type="number"
                      min={2}
                      max={360}
                      value={numeroParcelas}
                      onChange={(e) => {
                        setNumeroParcelas(e.target.value);
                        dividirParcelasIgualmente(valor, e.target.value);
                      }}
                      className="h-11 bg-surface"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Valor de cada parcela</Label>
                      <button
                        type="button"
                        onClick={() => dividirParcelasIgualmente()}
                        className="text-nano font-medium text-brand hover:underline"
                      >
                        Dividir igualmente
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {parcelas.map((valorParcela, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-14 shrink-0 text-nano text-ink-muted">
                            {i + 1}/{parcelas.length}
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={valorParcela}
                            onChange={(e) =>
                              setParcelas((atuais) =>
                                atuais.map((v, idx) => (idx === i ? e.target.value : v)),
                              )
                            }
                            className="h-10 flex-1 bg-surface"
                          />
                        </div>
                      ))}
                    </div>
                    {erroValor && <p className="text-nano text-negative-text">{erroValor}</p>}
                  </div>
                </div>
              )}

              {modalidade === "RECORRENTE" && (
                <div className="space-y-1.5">
                  <Label htmlFor="nov-meses">Repetir por quantos meses</Label>
                  <Input
                    id="nov-meses"
                    type="number"
                    min={2}
                    max={360}
                    value={quantidadeMeses}
                    onChange={(e) => setQuantidadeMeses(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <GatilhoSelecao
                  label={categoriaSelecionada?.nome ?? null}
                  placeholder="Sem categoria"
                  onClick={() => setModalAberto("categoria")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fornecedor/Cliente</Label>
                <GatilhoSelecao
                  label={contatoSelecionado?.nome ?? null}
                  placeholder="Sem fornecedor/cliente"
                  onClick={() => setModalAberto("contato")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nov-data">
                  {modalidade === "UNICA" ? "Data" : "Vencimento da 1ª ocorrência"}
                </Label>
                <Input
                  id="nov-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              {modalidade === "UNICA" && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <GatilhoSelecao
                    label={ROTULO_STATUS_LANCAMENTO[status]}
                    placeholder="Escolher status"
                    onClick={() => setModalAberto("status")}
                  />
                </div>
              )}

              {contasNaoCartao.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Conta</Label>
                  <GatilhoSelecao
                    label={contasNaoCartao.find((c) => c.id === contaId)?.nome ?? null}
                    placeholder="Escolher conta"
                    onClick={() => setModalAberto("conta")}
                  />
                </div>
              )}
            </>
          )}
        </form>
        )}
      </ResponsiveModal>

      <SeletorCategoriaContatoModal
        tipo="categoria"
        aberto={modalAberto === "categoria"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        value={categoriaId}
        onValueChange={setCategoriaId}
        opcoes={[
          { value: SEM_CATEGORIA, label: "Sem categoria" },
          ...categoriasDoTipo.map((c) => ({ value: c.id, label: c.nome })),
        ]}
        categorias={categorias}
        linhas={linhas}
        tipoEspaco={tipoEspaco}
        tipoPadrao={tipo === "TRANSFERENCIA" ? undefined : tipo}
        aoCriar={(categoria) => setCategorias((atual) => [...atual, categoria])}
      />

      <SeletorCategoriaContatoModal
        tipo="contato"
        aberto={modalAberto === "contato"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        value={contatoId}
        onValueChange={setContatoId}
        opcoes={[
          { value: SEM_FORNECEDOR, label: "Sem fornecedor/cliente" },
          ...contatos.map((c) => ({ value: c.id, label: c.nome })),
        ]}
        aoCriar={(contato) => setContatos((atual) => [...atual, contato])}
      />

      <SeletorListaModal
        aberto={modalAberto === "contaOrigem"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Conta de origem"
        value={contaId}
        onValueChange={setContaId}
        opcoes={contas.map((c) => ({ value: c.id, label: c.nome }))}
      />

      <SeletorListaModal
        aberto={modalAberto === "contaDestino"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Conta de destino"
        value={contaDestinoId}
        onValueChange={setContaDestinoId}
        opcoes={contas.map((c) => ({ value: c.id, label: c.nome }))}
      />

      <SeletorListaModal
        aberto={modalAberto === "status"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Status"
        value={status}
        onValueChange={(v) => setStatus(v as typeof status)}
        opcoes={(Object.keys(ROTULO_STATUS_LANCAMENTO) as (keyof typeof ROTULO_STATUS_LANCAMENTO)[]).map(
          (v) => ({ value: v, label: ROTULO_STATUS_LANCAMENTO[v] }),
        )}
        buscavel={false}
      />

      <SeletorListaModal
        aberto={modalAberto === "conta"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Conta"
        value={contaId}
        onValueChange={setContaId}
        opcoes={contasNaoCartao.map((c) => ({ value: c.id, label: c.nome }))}
      />
    </>
  );
}
