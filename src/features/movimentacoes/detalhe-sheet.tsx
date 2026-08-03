"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Building2, Calendar, CreditCard, FileText, RotateCcw, Tag, Trash2, Users } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarData } from "@/lib/dates";
import { iconeDe } from "@/lib/icones";
import { parseMoeda } from "@/lib/money";
import {
  desfazerConciliacao,
  editarMovimentacao,
  excluirMovimentacao,
} from "@/services/movimentacoes/actions";
import { ROTULO_STATUS } from "@/types/dominio";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";

type OpcaoConta = { id: string; nome: string };
type OpcaoCategoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };
type OpcaoContato = { id: string; nome: string };

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
  categorias = [],
  contatos = [],
  aoFechar,
}: {
  movimentacao: MovimentacaoResumo | null;
  contas?: OpcaoConta[];
  categorias?: OpcaoCategoria[];
  contatos?: OpcaoContato[];
  aoFechar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  if (!movimentacao) return null;

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
        ) : (
          <>
            <Button variant="outline" className="flex-1" onClick={aoFechar}>
              Fechar
            </Button>
            <Button className="flex-1" onClick={() => setEditando(true)}>
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
          aoPendingChange={setSalvandoEdicao}
          aoSalvar={() => {
            setEditando(false);
            aoFechar();
          }}
        />
      ) : (
        <Detalhe movimentacao={movimentacao} aoRemover={aoFechar} />
      )}
    </ResponsiveModal>
  );
}

function Detalhe({
  movimentacao,
  aoRemover,
}: {
  movimentacao: MovimentacaoResumo;
  aoRemover: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const Icone = movimentacao.categoria ? iconeDe(movimentacao.categoria.icone) : Tag;
  const receita = movimentacao.tipo === "RECEITA";
  const conciliada = movimentacao.status === "CONCILIADO";

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

      {conciliada ? (
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-micro text-ink-muted">
              Conciliada com o extrato — desfaça para poder editar ou excluir.
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
  aoSalvar,
  aoPendingChange,
}: {
  movimentacao: MovimentacaoResumo;
  contas: OpcaoConta[];
  categorias: OpcaoCategoria[];
  contatos: OpcaoContato[];
  aoSalvar: () => void;
  aoPendingChange: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
        <Input
          id="edit-descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="h-11"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RECEITA">Receita</SelectItem>
            <SelectItem value="DESPESA">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <SearchableSelect
          value={categoriaId}
          onValueChange={setCategoriaId}
          placeholder="Sem categoria"
          searchPlaceholder="Buscar categoria…"
          emptyText="Nenhuma categoria encontrada."
          options={[
            { value: SEM_CATEGORIA, label: "Sem categoria" },
            ...categoriasDoTipo.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-data">Data</Label>
        <Input
          id="edit-data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="h-11"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PAGO">Pago</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="CONCILIADO">Conciliado</SelectItem>
          </SelectContent>
        </Select>
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

      <div className="space-y-1.5">
        <Label>Fornecedor/Cliente</Label>
        <SearchableSelect
          value={contatoId}
          onValueChange={setContatoId}
          placeholder="Sem fornecedor/cliente"
          searchPlaceholder="Buscar fornecedor/cliente…"
          emptyText="Nenhum fornecedor/cliente encontrado."
          options={[
            { value: SEM_FORNECEDOR, label: "Sem fornecedor/cliente" },
            ...contatos.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
      </div>
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
