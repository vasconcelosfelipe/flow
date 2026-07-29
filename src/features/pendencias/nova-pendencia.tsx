"use client";

import { useState } from "react";
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

export function BotaoNovaPendencia() {
  const [aberto, setAberto] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: conectar ao Server Action quando o backend estiver pronto
    setAberto(false);
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Novo título
      </Button>

      <ResponsiveModal
        aberto={aberto}
        aoMudarAberto={setAberto}
        titulo="Novo título"
        descricao="Registre uma conta a pagar ou a receber."
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pend-descricao">Descrição</Label>
              <Input id="pend-descricao" placeholder="Ex: Fatura do fornecedor" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pend-valor">Valor (R$)</Label>
              <Input
                id="pend-valor"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pend-tipo">Tipo</Label>
              <Select required defaultValue="DESPESA">
                <SelectTrigger id="pend-tipo">
                  <SelectValue />
                </SelectTrigger>
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
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pend-contato">Contato (opcional)</Label>
              <Input id="pend-contato" placeholder="Nome do cliente ou fornecedor" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </ResponsiveModal>
    </>
  );
}
