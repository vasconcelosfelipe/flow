"use client";

import { useEffect, useTransition, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { dividirEmParcelas, formatarValor, parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import { criarPendencia } from "@/services/movimentacoes/actions";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

type Modalidade = "UNICA" | "PARCELADO" | "RECORRENTE";
type OpcaoConta = { id: string; nome: string };

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";
const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  UNICA: "Única",
  PARCELADO: "Parcelado",
  RECORRENTE: "Recorrente",
};

/**
 * Campos de uma compra no cartão — mesma lógica de ocorrência
 * (única/parcelado/recorrente) de `BotaoNovaPendencia`, sem o botão/modal
 * ao redor, pra caber tanto na tela do cartão (`BotaoNovaCompraCartao`)
 * quanto dentro do fluxo unificado de "Nova movimentação". `criarPendencia`
 * reconhece conta tipo CARTAO e grava `status: PAGO` com a data calculada
 * pelo ciclo da fatura em vez de `PENDENTE` — o campo que aqui chama "Data
 * da compra" é o mesmo `dataVencimento` que numa pendência normal seria o
 * vencimento, o servidor decide o que fazer com ele a partir do tipo da
 * conta.
 */
export function FormularioCompraCartao({
  formId,
  contas,
  categorias: categoriasIniciais = [],
  contatos: contatosIniciais = [],
  linhas = [],
  tipoEspaco,
  aoSalvar,
  aoPendingChange,
}: {
  formId: string;
  contas: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  aoSalvar: () => void;
  aoPendingChange?: (pending: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [modalAberto, setModalAberto] = useState<"categoria" | "contato" | "cartao" | null>(null);
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [contatos, setContatos] = useState(contatosIniciais);

  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState(SEM_CATEGORIA);
  const [contatoId, setContatoId] = useState(SEM_FORNECEDOR);

  const [modalidade, setModalidade] = useState<Modalidade>("UNICA");
  const [numeroParcelas, setNumeroParcelas] = useState("2");
  const [parcelas, setParcelas] = useState<string[]>([]);
  const [quantidadeMeses, setQuantidadeMeses] = useState("2");

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId);
  const contatoSelecionado = contatos.find((c) => c.id === contatoId);

  useEffect(() => {
    if (categoriaId === SEM_CATEGORIA) return;
    if (!categoriasDoTipo.some((c) => c.id === categoriaId)) setCategoriaId(SEM_CATEGORIA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  useEffect(() => {
    aoPendingChange?.(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function dividirParcelasIgualmente(valorTexto = valor, quantidadeTexto = numeroParcelas) {
    const total = parseMoeda(valorTexto) ?? 0;
    const quantidade = Math.max(2, Math.min(360, Number(quantidadeTexto) || 2));
    setParcelas(dividirEmParcelas(total, quantidade).map((c) => formatarValor(c)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contaId) return;

    const camposComuns = {
      descricao,
      tipo,
      contaId,
      categoriaId: categoriaId === SEM_CATEGORIA ? null : categoriaId,
      contatoId: contatoId === SEM_FORNECEDOR ? null : contatoId,
      dataVencimento: dataCompra,
    };

    if (modalidade === "UNICA") {
      const centavos = parseMoeda(valor);
      if (!centavos || centavos <= 0) {
        setErroValor("Digite um valor válido.");
        return;
      }
      startTransition(async () => {
        await criarPendencia({ ...camposComuns, modalidade: "UNICA", valorCentavos: centavos });
        aoSalvar();
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
        await criarPendencia({ ...camposComuns, modalidade: "PARCELADO", parcelas: valoresParcelas });
        aoSalvar();
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
      });
      aoSalvar();
    });
  }

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4 py-2">
        {contas.length > 1 && (
          <div className="space-y-1.5">
            <Label>Cartão</Label>
            <GatilhoSelecao
              label={contas.find((c) => c.id === contaId)?.nome ?? null}
              placeholder="Escolher cartão"
              onClick={() => setModalAberto("cartao")}
            />
          </div>
        )}

        {modalidade !== "PARCELADO" && (
          <div className="space-y-1.5">
            <Label htmlFor="cc-valor">
              {modalidade === "RECORRENTE" ? "Valor de cada ocorrência (R$)" : "Valor (R$)"}
            </Label>
            <Input
              id="cc-valor"
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
          <Label htmlFor="cc-descricao">Descrição</Label>
          <Input
            id="cc-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Mercado, assinatura, jantar"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["DESPESA", "RECEITA"] as const).map((valorTipo) => (
              <button
                key={valorTipo}
                type="button"
                onClick={() => setTipo(valorTipo)}
                className={cn(
                  "h-11 rounded-lg border text-micro font-medium transition-colors",
                  tipo === valorTipo
                    ? valorTipo === "RECEITA"
                      ? "border-positive bg-positive-wash text-positive-text"
                      : "border-negative bg-negative-wash text-negative-text"
                    : "border-line text-ink-muted hover:bg-muted",
                )}
              >
                {valorTipo === "DESPESA" ? "Compra" : "Estorno"}
              </button>
            ))}
          </div>
        </div>

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
              <Label htmlFor="cc-valor-total">Valor total (R$)</Label>
              <Input
                id="cc-valor-total"
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
              <Label htmlFor="cc-num-parcelas">Número de parcelas</Label>
              <Input
                id="cc-num-parcelas"
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
            <Label htmlFor="cc-meses">Repetir por quantos meses</Label>
            <Input
              id="cc-meses"
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
          <Label htmlFor="cc-data">Data da compra</Label>
          <Input
            id="cc-data"
            type="date"
            value={dataCompra}
            onChange={(e) => setDataCompra(e.target.value)}
            className="h-11"
            required
          />
          <p className="text-nano text-ink-muted">
            A fatura em que cada parcela cai é calculada sozinha, a partir do fechamento do
            cartão.
          </p>
        </div>
      </form>

      {modalAberto === "categoria" && (
        <SeletorCategoriaContatoModal
          tipo="categoria"
          aberto
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
          tipoPadrao={tipo}
          aoCriar={(categoria) => setCategorias((atual) => [...atual, categoria])}
        />
      )}

      {modalAberto === "contato" && (
        <SeletorCategoriaContatoModal
          tipo="contato"
          aberto
          aoMudarAberto={(a) => !a && setModalAberto(null)}
          value={contatoId}
          onValueChange={setContatoId}
          opcoes={[
            { value: SEM_FORNECEDOR, label: "Sem fornecedor/cliente" },
            ...contatos.map((c) => ({ value: c.id, label: c.nome })),
          ]}
          aoCriar={(contato) => setContatos((atual) => [...atual, contato])}
        />
      )}

      {modalAberto === "cartao" && (
        <SeletorListaModal
          aberto
          aoMudarAberto={(a) => !a && setModalAberto(null)}
          titulo="Cartão"
          value={contaId}
          onValueChange={setContaId}
          opcoes={contas.map((c) => ({ value: c.id, label: c.nome }))}
        />
      )}
    </>
  );
}
