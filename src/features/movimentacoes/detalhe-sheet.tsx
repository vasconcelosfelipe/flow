"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeftRight, Building2, Calendar, CreditCard, FileText, RotateCcw, Tag, Trash2, Users, X } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { formatarData } from "@/lib/dates";
import { iconeDe } from "@/lib/icones";
import { parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  desfazerConciliacao,
  editarMovimentacao,
  excluirMovimentacao,
} from "@/services/movimentacoes/actions";
import { ROTULO_STATUS } from "@/types/dominio";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

type OpcaoConta = { id: string; nome: string };

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";
const FORM_EDICAO_ID = "form-editar-movimentacao";

/**
 * Detalhe de uma movimentação, em folha (celular) ou diálogo (desktop) via
 * `ResponsiveModal` — um único contrato para as duas apresentações.
 *
 * Alterna entre leitura e edição no mesmo sheet: entrar em modo de edição
 * não é uma tela nova, só troca o que aparece dentro do mesmo contêiner.
 */
export function DetalheMovimentacaoSheet({
  movimentacao,
  contas = [],
  categorias: categoriasIniciais = [],
  contatos: contatosIniciais = [],
  linhas = [],
  tipoEspaco,
  aoFechar,
  aoEditar,
  somenteLeitura = false,
}: {
  movimentacao: MovimentacaoResumo | null;
  contas?: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  aoFechar: () => void;
  /** Atualiza a linha na lista da tela de trás na hora, sem esperar o
   * round-trip do `router.refresh()` — é o que faz a edição parecer
   * instantânea em vez de "só atualiza depois de um tempinho". */
  aoEditar?: (atualizada: MovimentacaoResumo) => void;
  somenteLeitura?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  // Categoria/fornecedor criados na hora entram aqui pra ficarem
  // selecionáveis sem precisar recarregar a página.
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [contatos, setContatos] = useState(contatosIniciais);

  if (!movimentacao) return null;

  const transferencia = movimentacao.transferenciaId !== null;

  return (
    <ResponsiveModal
      aberto={!!movimentacao}
      aoMudarAberto={(aberto) => {
        if (!aberto) {
          setEditando(false);
          aoFechar();
        }
      }}
      titulo={editando ? "Editar movimentação" : movimentacao.descricao}
      descricao={editando ? "Ajuste os dados deste lançamento." : "Detalhes da movimentação selecionada."}
      rodape={
        editando ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setEditando(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_EDICAO_ID}
              size="lg"
              className="flex-1"
              disabled={salvandoEdicao}
            >
              {salvandoEdicao ? "Salvando…" : "Salvar"}
            </Button>
          </>
        ) : transferencia || somenteLeitura ? (
          <Button variant="outline" className="flex-1" onClick={aoFechar}>
            Fechar
          </Button>
        ) : (
          <>
            <Button variant="outline" className="flex-1" onClick={aoFechar}>
              Fechar
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                // Adiar pro próximo tick: se o botão some da árvore no mesmo
                // ciclo síncrono do clique (troca pra FormularioEdicao), o
                // dismissable layer do Radix (Dialog/Drawer) às vezes lê o
                // pointerup como clique fora do conteúdo e fecha a folha
                // inteira em vez de entrar em edição.
                setTimeout(() => setEditando(true), 0);
              }}
            >
              Editar
            </Button>
          </>
        )
      }
    >
      {editando ? (
        <FormularioEdicao
          movimentacao={movimentacao}
          contas={contas}
          categorias={categorias}
          contatos={contatos}
          linhas={linhas}
          tipoEspaco={tipoEspaco}
          aoCriarCategoria={(categoria) => setCategorias((atual) => [...atual, categoria])}
          aoCriarContato={(contato) => setContatos((atual) => [...atual, contato])}
          aoPendingChange={setSalvandoEdicao}
          aoEditar={aoEditar}
          aoSalvar={() => {
            setEditando(false);
            aoFechar();
          }}
        />
      ) : (
        <Detalhe movimentacao={movimentacao} aoRemover={aoFechar} somenteLeitura={somenteLeitura} />
      )}
    </ResponsiveModal>
  );
}

function Detalhe({
  movimentacao,
  aoRemover,
  somenteLeitura = false,
}: {
  movimentacao: MovimentacaoResumo;
  aoRemover: () => void;
  somenteLeitura?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const transferencia = movimentacao.transferenciaId !== null;
  const Icone = transferencia ? ArrowLeftRight : movimentacao.categoria ? iconeDe(movimentacao.categoria.icone) : Tag;
  const receita = movimentacao.tipo === "RECEITA";
  const conciliada = movimentacao.status === "CONCILIADO";
  // Deriva por tipo, não por qual perna virou a linha representativa —
  // robusto tanto pra vista sem filtro (sempre a perna DESPESA) quanto pra
  // vista filtrada por uma conta específica (pode ser qualquer uma das duas).
  const contaSaida = movimentacao.tipo === "DESPESA" ? movimentacao.conta : movimentacao.contaPar;
  const contaEntrada = movimentacao.tipo === "DESPESA" ? movimentacao.contaPar : movimentacao.conta;

  function excluir() {
    startTransition(async () => {
      await excluirMovimentacao(movimentacao.id);
      router.refresh();
      aoRemover();
    });
  }

  function desfazer() {
    startTransition(async () => {
      await desfazerConciliacao(movimentacao.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl"
          style={
            transferencia
              ? { backgroundColor: "var(--brand-wash)", color: "var(--brand)" }
              : movimentacao.categoria
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
            tom={transferencia ? "transferencia" : "auto"}
          />
          <p className="text-micro text-ink-muted">
            {transferencia
              ? "Transferência entre contas"
              : (movimentacao.categoria?.nome ?? "Sem categoria")}
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
        {transferencia ? (
          <>
            <LinhaDetalhe icone={CreditCard} rotulo="Conta de saída" valor={contaSaida?.nome ?? "—"} />
            <LinhaDetalhe icone={CreditCard} rotulo="Conta de entrada" valor={contaEntrada?.nome ?? "—"} />
          </>
        ) : (
          <LinhaDetalhe icone={CreditCard} rotulo="Conta" valor={movimentacao.conta.nome} />
        )}
        {movimentacao.contato && (
          <LinhaDetalhe icone={Users} rotulo="Fornecedor/Cliente" valor={movimentacao.contato.nome} />
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

      {somenteLeitura ? null : conciliada ? (
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-micro text-ink-muted">
              Conciliada com o extrato — desfaça para poder excluir.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={desfazer}
              disabled={pending}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Desfazer
            </Button>
          </div>
        </div>
      ) : confirmandoExclusao ? (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-micro text-ink">Excluir esta movimentação?</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setConfirmandoExclusao(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1 border-transparent bg-negative text-white hover:bg-negative/90"
              onClick={excluir}
              disabled={pending}
            >
              {pending ? "Excluindo…" : "Confirmar"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="lg"
          className="w-full gap-1.5 border-transparent bg-negative text-white hover:bg-negative/90"
          onClick={() => setConfirmandoExclusao(true)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Excluir movimentação
        </Button>
      )}
    </div>
  );
}

function FormularioEdicao({
  movimentacao,
  contas,
  categorias,
  contatos,
  linhas,
  tipoEspaco,
  aoCriarCategoria,
  aoCriarContato,
  aoSalvar,
  aoPendingChange,
  aoEditar,
}: {
  movimentacao: MovimentacaoResumo;
  contas: OpcaoConta[];
  categorias: CategoriaCompleta[];
  contatos: ContatoCompleto[];
  linhas: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  aoCriarCategoria: (categoria: CategoriaCompleta) => void;
  aoCriarContato: (contato: ContatoCompleto) => void;
  aoSalvar: () => void;
  aoPendingChange: (pending: boolean) => void;
  aoEditar?: (atualizada: MovimentacaoResumo) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalAberto, setModalAberto] = useState<"categoria" | "contato" | "status" | "conta" | null>(
    null,
  );
  // Lançamento de cartão vive fora do PENDENTE/PAGO comum — nasce PAGO com
  // a data já calculada pelo ciclo da fatura (ver `criarPendencia`). Deixar
  // trocar o status aqui tiraria a linha da fatura sem avisar (viraria
  // PENDENTE com `dataVencimento`, e `listarFaturaCartao` procura por
  // `data`) — por isso nem mostra o seletor, e a conta fica travada na
  // mesma (trocar de cartão exigiria recalcular o ciclo, que esta tela
  // genérica não faz).
  const ehCartao = movimentacao.conta.tipo === "CARTAO";

  useEffect(() => {
    aoPendingChange(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const dataInicial = (movimentacao.data ?? movimentacao.dataVencimento ?? new Date())
    .toISOString()
    .slice(0, 10);

  const [descricao, setDescricao] = useState(movimentacao.descricao);
  const [valor, setValor] = useState((movimentacao.valorCentavos / 100).toFixed(2).replace(".", ","));
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">(movimentacao.tipo);
  const [data, setData] = useState(dataInicial);
  const [status, setStatus] = useState<"PAGO" | "PENDENTE" | "CONCILIADO">(
    movimentacao.status === "PREVISTO" || movimentacao.status === "CANCELADO"
      ? "PENDENTE"
      : movimentacao.status,
  );
  const [contaId, setContaId] = useState(movimentacao.conta.id);
  const [categoriaId, setCategoriaId] = useState(movimentacao.categoria?.id ?? SEM_CATEGORIA);
  const [contatoId, setContatoId] = useState(movimentacao.contato?.id ?? SEM_FORNECEDOR);

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId);
  const contatoSelecionado = contatos.find((c) => c.id === contatoId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const centavos = parseMoeda(valor);
    if (!centavos || centavos <= 0) {
      setErroValor("Digite um valor válido.");
      return;
    }
    startTransition(async () => {
      await editarMovimentacao(movimentacao.id, {
        descricao,
        tipo,
        valorCentavos: centavos,
        contaId,
        categoriaId: categoriaId === SEM_CATEGORIA ? null : categoriaId,
        contatoId: contatoId === SEM_FORNECEDOR ? null : contatoId,
        status,
        data,
      });
      // Atualiza a linha na lista de trás na hora — `router.refresh()`
      // ainda roda por baixo pra manter tudo consistente (saldo, DRE etc.),
      // mas sem isto a edição só aparece depois do round-trip completar.
      const contaSelecionada = contas.find((c) => c.id === contaId);
      const dataUtc = new Date(`${data}T00:00:00.000Z`);
      aoEditar?.({
        ...movimentacao,
        descricao,
        tipo,
        valorCentavos: centavos,
        status,
        data: status === "PENDENTE" ? null : dataUtc,
        dataVencimento: status === "PENDENTE" ? dataUtc : null,
        conta: contaSelecionada
          ? { ...movimentacao.conta, id: contaSelecionada.id, nome: contaSelecionada.nome }
          : movimentacao.conta,
        categoria: categoriaSelecionada
          ? {
              id: categoriaSelecionada.id,
              nome: categoriaSelecionada.nome,
              icone: categoriaSelecionada.icone,
              cor: categoriaSelecionada.cor,
            }
          : null,
        contato: contatoSelecionado ? { id: contatoSelecionado.id, nome: contatoSelecionado.nome } : null,
      });
      router.refresh();
      aoSalvar();
    });
  }

  return (
    <form id={FORM_EDICAO_ID} onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="edit-valor">Valor (R$)</Label>
        <Input
          id="edit-valor"
          type="text"
          inputMode="decimal"
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
        <Label htmlFor="edit-descricao">Descrição</Label>
        <div className="relative">
          <Input
            id="edit-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="h-11 pr-9"
            required
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
        <div className="grid grid-cols-2 gap-2">
          {(["RECEITA", "DESPESA"] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setTipo(valor)}
              className={cn(
                "h-11 rounded-lg border text-micro font-medium transition-colors",
                tipo === valor
                  ? valor === "RECEITA"
                    ? "border-positive bg-positive-wash text-positive-text"
                    : "border-negative bg-negative-wash text-negative-text"
                  : "border-line text-ink-muted hover:bg-muted",
              )}
            >
              {valor === "RECEITA" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <GatilhoSelecao
          label={categoriaSelecionada?.nome ?? null}
          placeholder="Sem categoria"
          onClick={() => setModalAberto("categoria")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-data">{ehCartao ? "Vencimento da fatura" : "Data"}</Label>
        <Input
          id="edit-data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="h-11"
          required
        />
      </div>

      {!ehCartao && (
        <div className="space-y-1.5">
          <Label>Status</Label>
          <GatilhoSelecao
            label={ROTULO_STATUS[status]}
            placeholder="Escolher status"
            onClick={() => setModalAberto("status")}
          />
        </div>
      )}

      {!ehCartao && contas.length > 0 && (
        <div className="space-y-1.5">
          <Label>Conta</Label>
          <GatilhoSelecao
            label={contas.find((c) => c.id === contaId)?.nome ?? null}
            placeholder="Escolher conta"
            onClick={() => setModalAberto("conta")}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Fornecedor/Cliente</Label>
        <GatilhoSelecao
          label={contatoSelecionado?.nome ?? null}
          placeholder="Sem fornecedor/cliente"
          onClick={() => setModalAberto("contato")}
        />
      </div>

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
        tipoPadrao={tipo}
        aoCriar={aoCriarCategoria}
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
        aoCriar={aoCriarContato}
      />

      <SeletorListaModal
        aberto={modalAberto === "status"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Status"
        value={status}
        onValueChange={(v) => setStatus(v as typeof status)}
        opcoes={[
          { value: "PAGO", label: "Pago" },
          { value: "PENDENTE", label: "Pendente" },
          { value: "CONCILIADO", label: "Conciliado" },
        ]}
        buscavel={false}
      />

      <SeletorListaModal
        aberto={modalAberto === "conta"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Conta"
        value={contaId}
        onValueChange={setContaId}
        opcoes={contas.map((c) => ({ value: c.id, label: c.nome }))}
      />
    </form>
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
