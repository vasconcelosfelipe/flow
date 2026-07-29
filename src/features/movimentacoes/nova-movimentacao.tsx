"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";

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

export function BotoesMovimentacoes() {
  const [aberto, setAberto] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: conectar ao Server Action quando o backend estiver pronto
    setAberto(false);
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
        aoMudarAberto={setAberto}
        titulo="Nova movimentação"
        descricao="Registre uma entrada ou saída manualmente."
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nova-descricao">Descrição</Label>
              <Input id="nova-descricao" placeholder="Ex: Aluguel de equipamento" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nova-valor">Valor (R$)</Label>
              <Input
                id="nova-valor"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nova-tipo">Tipo</Label>
              <Select required defaultValue="DESPESA">
                <SelectTrigger id="nova-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nova-data">Data</Label>
              <Input
                id="nova-data"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nova-status">Status</Label>
              <Select required defaultValue="PAGO">
                <SelectTrigger id="nova-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="CONCILIADO">Conciliado</SelectItem>
                </SelectContent>
              </Select>
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
