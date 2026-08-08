"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dividirEmParcelas, formatarValor, parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import { criarPendencia } from "@/services/movimentacoes/actions";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

type OpcaoConta = { id: string; nome: string };
type Modalidade = "UNICA" | "PARCELADO" | "RECORRENTE";

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";
const FORM_ID = "form-nova-pendencia";
const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  UNICA: "Única",
  PARCELADO: "Parcelado",
  RECORRENTE: "Recorrente",
};

export function BotaoNovaPendencia({
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
  const [aberto, setAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState<"categoria" | "contato" | null>(null);
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [contatos, setContatos] = useState(contatosIniciais);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
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

  if (somenteLeitura) return null;

  function resetar() {
    setDescricao("");
    setValor("");
    setErroValor(null);
    setTipo("DESPESA");
    setVencimento(new Date().toISOString().slice(0, 10));
    setContaId(contas[0]?.id ?? "");
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
    if (!contaId) return;

    const camposComuns = {
      descricao,
      tipo,
      contaId,
      categoriaId: categoriaId === SEM_CATEGORIA ? null : categoriaId,
      contatoId: contatoId === SEM_FORNECEDOR ? null : contatoId,
      dataVencimento: vencimento,
    };

    if (modalidade === "UNICA") {
      const centavos = parseMoeda(valor);
      if (!centavos || centavos <= 0) {
        setErroValor("Digite um valor válido.");
        return;
      }
      startTransition(async () => {
        await criarPendencia({ ...camposComuns, modalidade: "UNICA", valorCentavos: centavos });
        setAberto(false);
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
        await criarPendencia({ ...camposComuns, modalidade: "PARCELADO", parcelas: valoresParcelas });
        setAberto(false);
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
      });
      setAberto(false);
      resetar();
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Novo título
      </Button>

      <ResponsiveModal
        aberto={aberto}
        aoMudarAberto={(v) => { setAberto(v); if (!v) resetar(); }}
        titulo="Novo título"
        descricao="Registre uma conta a pagar ou a receber."
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => { setAberto(false); resetar(); }}
            >
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} size="lg" className="flex-1" disabled={pending || !contaId}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 py-2">
          {modalidade !== "PARCELADO" && (
            <div className="space-y-1.5">
              <Label htmlFor="pend-valor">
                {modalidade === "RECORRENTE" ? "Valor de cada ocorrência (R$)" : "Valor (R$)"}
              </Label>
              <Input
                id="pend-valor"
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
            <Label htmlFor="pend-descricao">Descrição</Label>
            <Input
              id="pend-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Fatura do fornecedor"
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
                  {valorTipo === "DESPESA" ? "A pagar" : "A receber"}
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
                <Label htmlFor="pend-valor-total">Valor total (R$)</Label>
                <Input
                  id="pend-valor-total"
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
                <Label htmlFor="pend-num-parcelas">Número de parcelas</Label>
                <Input
                  id="pend-num-parcelas"
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
              <Label htmlFor="pend-meses">Repetir por quantos meses</Label>
              <Input
                id="pend-meses"
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
            <Label htmlFor="pend-vencimento">
              {modalidade === "UNICA" ? "Vencimento" : "Vencimento da 1ª ocorrência"}
            </Label>
            <Input
              id="pend-vencimento"
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
              className="h-11"
              required
            />
          </div>

          {contas.length > 0 && (
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>
      </ResponsiveModal>

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
    </>
  );
}
