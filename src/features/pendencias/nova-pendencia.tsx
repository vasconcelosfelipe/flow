"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { Plus } from "lucide-react";

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
import { criarPendencia } from "@/services/movimentacoes/actions";

type OpcaoConta = { id: string; nome: string };
type OpcaoCategoria = { id: string; nome: string; tipo: "RECEITA" | "DESPESA" };
type OpcaoContato = { id: string; nome: string };

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";
const FORM_ID = "form-nova-pendencia";

export function BotaoNovaPendencia({
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
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState(SEM_CATEGORIA);
  const [contatoId, setContatoId] = useState(SEM_FORNECEDOR);

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
    setTipo("DESPESA");
    setVencimento(new Date().toISOString().slice(0, 10));
    setContaId(contas[0]?.id ?? "");
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
    startTransition(async () => {
      await criarPendencia({
        descricao,
        tipo,
        valorCentavos: centavos,
        contaId,
        categoriaId: categoriaId === SEM_CATEGORIA ? null : categoriaId,
        contatoId: contatoId === SEM_FORNECEDOR ? null : contatoId,
        dataVencimento: vencimento,
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
          <div className="space-y-1.5">
            <Label htmlFor="pend-valor">Valor (R$)</Label>
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
            <Label htmlFor="pend-vencimento">Vencimento</Label>
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
    </>
  );
}
