"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { ArrowLeftRight, ChevronRight, CreditCard, Landmark, Plus, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { FormularioCompraCartao } from "@/features/contas/formulario-compra-cartao";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import { criarMovimentacao, criarTransferencia } from "@/services/movimentacoes/actions";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoConta, TipoEmpresa } from "@/types/dominio";

type OpcaoConta = { id: string; nome: string; tipo?: TipoConta };
type TipoLancamento = "DESPESA" | "RECEITA" | "TRANSFERENCIA";

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

export function BotoesMovimentacoes({
  contas,
  categorias: categoriasIniciais = [],
  contatos: contatosIniciais = [],
  linhas = [],
  tipoEspaco,
  somenteLeitura = false,
}: {
  contas: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  somenteLeitura?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingCartao, setPendingCartao] = useState(false);
  const [aberto, setAberto] = useState(false);
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

  if (somenteLeitura) return null;

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
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const centavos = parseMoeda(valor);
    if (!centavos || centavos <= 0) {
      setErroValor("Digite um valor válido.");
      return;
    }
    if (!contaId) return;

    if (transferencia) {
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
        setAberto(false);
        resetar();
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      await criarMovimentacao({
        descricao,
        tipo,
        valorCentavos: centavos,
        contaId,
        categoriaId: categoriaId === SEM_CATEGORIA ? null : categoriaId,
        contatoId: contatoId === SEM_FORNECEDOR ? null : contatoId,
        status,
        data,
      });
      setAberto(false);
      resetar();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <Link href="/importar">
            <Upload className="size-4" aria-hidden="true" />
            Importar OFX
          </Link>
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setAberto(true);
            setModo(contasCartao.length === 0 ? "debito" : "escolha");
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova
        </Button>
      </div>

      <ResponsiveModal
        aberto={aberto}
        aoMudarAberto={(v) => { setAberto(v); if (!v) resetar(); }}
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
              onClick={() => { setAberto(false); resetar(); }}
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
                onClick={() => (contasCartao.length === 0 ? (setAberto(false), resetar()) : setModo("escolha"))}
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
                <span className="block font-medium text-ink">Débito em conta</span>
                <span className="block text-micro text-ink-muted">
                  Entrada ou saída numa conta corrente, poupança, caixa ou investimento.
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
            aoPendingChange={setPendingCartao}
            aoSalvar={() => {
              setAberto(false);
              resetar();
              router.refresh();
            }}
          />
        )}

        {modo === "debito" && (
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nov-valor">Valor (R$)</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="nov-descricao">Descrição{transferencia && " (opcional)"}</Label>
            <Input
              id="nov-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={transferencia ? "Ex: Reforço de caixa" : "Ex: Aluguel de equipamento"}
              className="h-11"
              required={!transferencia}
            />
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

              <div className="space-y-1.5">
                <Label>Status</Label>
                <GatilhoSelecao
                  label={ROTULO_STATUS_LANCAMENTO[status]}
                  placeholder="Escolher status"
                  onClick={() => setModalAberto("status")}
                />
              </div>

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
