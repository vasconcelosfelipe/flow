"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { ArrowLeftRight, Plus, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { SearchableSelect } from "@/components/shared/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import { criarMovimentacao, criarTransferencia } from "@/services/movimentacoes/actions";

type OpcaoConta = { id: string; nome: string };
type OpcaoCategoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };
type OpcaoContato = { id: string; nome: string };
type TipoLancamento = "DESPESA" | "RECEITA" | "TRANSFERENCIA";

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";
const FORM_ID = "form-nova-movimentacao";

const TIPOS: { valor: TipoLancamento; rotulo: string }[] = [
  { valor: "DESPESA", rotulo: "Despesa" },
  { valor: "RECEITA", rotulo: "Receita" },
  { valor: "TRANSFERENCIA", rotulo: "Transferência" },
];

export function BotoesMovimentacoes({
  contas,
  categorias = [],
  contatos = [],
}: {
  contas: OpcaoConta[];
  categorias?: OpcaoCategoria[];
  contatos?: OpcaoContato[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoLancamento>("DESPESA");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"PAGO" | "PENDENTE" | "CONCILIADO">("PAGO");
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [contaDestinoId, setContaDestinoId] = useState(contas[1]?.id ?? contas[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState(SEM_CATEGORIA);
  const [contatoId, setContatoId] = useState(SEM_FORNECEDOR);
  const [erroTransferencia, setErroTransferencia] = useState<string | null>(null);

  const transferencia = tipo === "TRANSFERENCIA";
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  useEffect(() => {
    if (categoriaId === SEM_CATEGORIA) return;
    if (!categoriasDoTipo.some((c) => c.id === categoriaId)) setCategoriaId(SEM_CATEGORIA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  function resetar() {
    setDescricao("");
    setValor("");
    setErroValor(null);
    setErroTransferencia(null);
    setTipo("DESPESA");
    setData(new Date().toISOString().slice(0, 10));
    setStatus("PAGO");
    setContaId(contas[0]?.id ?? "");
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
        <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nova
        </Button>
      </div>

      <ResponsiveModal
        aberto={aberto}
        aoMudarAberto={(v) => { setAberto(v); if (!v) resetar(); }}
        titulo="Nova movimentação"
        descricao="Registre uma entrada, saída ou transferência entre contas."
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

              <div className="space-y-1.5">
                <Label>Conta de destino</Label>
                <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                  <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </>
          )}
        </form>
      </ResponsiveModal>
    </>
  );
}
