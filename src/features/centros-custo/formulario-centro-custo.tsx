"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tag, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CentroCustoCompleto, FormularioCentroCusto } from "@/services/centros-custo/dto";

const PALETA_CORES = [
  "#2563EB", "#7C3AED", "#0EA5E9", "#059669",
  "#F97316", "#EF4444", "#EC4899", "#64748B",
];

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(40),
  cor: z.string(),
});

export function FormularioCentroCusto({
  centro,
  aoSalvar,
  aoExcluir,
  aoCancelar,
}: {
  centro: CentroCustoCompleto | null;
  aoSalvar: (dados: FormularioCentroCusto) => void;
  aoExcluir?: (id: string) => void;
  aoCancelar: () => void;
}) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: centro?.nome ?? "",
      cor: centro?.cor ?? PALETA_CORES[0],
    },
  });

  const cor = watch("cor");

  function enviar(dados: z.infer<typeof schema>) {
    aoSalvar({ id: centro?.id, ...dados });
  }

  const emUso = (centro?.quantidadeMovimentacoes ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit(enviar)} className="space-y-5 py-2">
      <div className="flex items-center gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `${cor}1a`, color: cor }}
        >
          <Tag className="size-5.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" {...register("nome")} placeholder="Ex.: Loja física" className="h-10" />
          {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {PALETA_CORES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={cor === c}
              onClick={() => setValue("cor", c)}
              className={cn(
                "size-8 rounded-full ring-offset-2 transition-shadow",
                cor === c && "ring-2 ring-ink",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {centro && aoExcluir && (
        <div className="rounded-xl border border-line p-3">
          {emUso ? (
            <p className="text-micro text-ink-muted">
              Usado em {centro.quantidadeMovimentacoes}{" "}
              {centro.quantidadeMovimentacoes === 1 ? "movimentação" : "movimentações"} — não pode
              ser excluído enquanto estiver em uso.
            </p>
          ) : confirmandoExclusao ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-micro text-ink">Excluir este centro de custo?</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmandoExclusao(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => aoExcluir(centro.id)}>
                  Confirmar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(true)}
              className="flex items-center gap-1.5 text-micro font-medium text-negative-text hover:underline"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Excluir centro de custo
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          Salvar
        </Button>
      </div>
    </form>
  );
}
