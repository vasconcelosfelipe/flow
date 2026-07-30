"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseMoeda } from "@/lib/money";
import { criarPendencia } from "@/services/movimentacoes/actions";

type OpcaoConta = { id: string; nome: string };

export function BotaoNovaPendencia({ contas }: { contas: OpcaoConta[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");

  function resetar() {
    setDescricao("");
    setValor("");
    setErroValor(null);
    setTipo("DESPESA");
    setVencimento(new Date().toISOString().slice(0, 10));
    setContaId(contas[0]?.id ?? "");
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
      await criarPendencia({ descricao, tipo, valorCentavos: centavos, contaId, dataVencimento: vencimento });
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
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pend-descricao">Descrição</Label>
              <Input
                id="pend-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Fatura do fornecedor"
                required
              />
            </div>

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
                required
              />
              {erroValor && <p className="text-nano text-negative-text">{erroValor}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESPESA">A pagar</SelectItem>
                  <SelectItem value="RECEITA">A receber</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pend-vencimento">Vencimento</Label>
              <Input
                id="pend-vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                required
              />
            </div>

            {contas.length > 0 && (
              <div className="col-span-2 space-y-1.5">
                <Label>Conta</Label>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setAberto(false); resetar(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !contaId}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </>
  );
}
