"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useState } from "react";

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
import { iconeDeConta } from "@/lib/icones-conta";
import { parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ROTULO_TIPO_CONTA, type TipoConta } from "@/types/dominio";
import type { ContaCompleta, FormularioConta } from "@/services/contas/dto";

export const FORM_ID_CONTA = "form-conta";

const TIPOS_CONTA = Object.keys(ROTULO_TIPO_CONTA) as TipoConta[];

const PALETA_CORES = [
  "#2563EB", "#7C3AED", "#0EA5E9", "#059669",
  "#F97316", "#EF4444", "#EC4899", "#64748B",
  "#F59E0B", "#14B8A6", "#6366F1", "#94A3B8",
];

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(40),
  tipo: z.enum(["CORRENTE", "POUPANCA", "CAIXA", "CARTAO", "INVESTIMENTO"]),
  cor: z.string(),
  saldoInicial: z.string().trim(),
  diaFechamento: z.string().trim(),
  diaVencimentoFatura: z.string().trim(),
});

/**
 * Um único formulário para criar e editar — a diferença entre os dois casos
 * é só ter ou não `conta` de partida, nunca uma tela separada.
 */
export function FormularioConta({
  conta,
  aoSalvar,
  aoExcluir,
}: {
  conta: ContaCompleta | null;
  aoSalvar: (dados: FormularioConta) => void;
  aoExcluir?: (id: string) => void;
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
      nome: conta?.nome ?? "",
      tipo: conta?.tipo ?? "CORRENTE",
      cor: conta?.cor ?? PALETA_CORES[0],
      saldoInicial: conta ? (conta.saldoInicialCentavos / 100).toFixed(2).replace(".", ",") : "0,00",
      diaFechamento: conta?.diaFechamento ? String(conta.diaFechamento) : "",
      diaVencimentoFatura: conta?.diaVencimentoFatura ? String(conta.diaVencimentoFatura) : "",
    },
  });

  const tipo = watch("tipo");
  const cor = watch("cor");
  const IconeSelecionado = iconeDeConta(tipo);

  function enviar(dados: z.infer<typeof schema>) {
    const diaValido = (v: string) => {
      const n = Number(v);
      return v.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
    };
    aoSalvar({
      id: conta?.id,
      nome: dados.nome,
      tipo: dados.tipo,
      cor: dados.cor,
      saldoInicialCentavos: parseMoeda(dados.saldoInicial) ?? 0,
      diaFechamento: dados.tipo === "CARTAO" ? diaValido(dados.diaFechamento) : null,
      diaVencimentoFatura: dados.tipo === "CARTAO" ? diaValido(dados.diaVencimentoFatura) : null,
    });
  }

  const emUso = (conta?.quantidadeMovimentacoes ?? 0) > 0;

  return (
    <form id={FORM_ID_CONTA} onSubmit={handleSubmit(enviar)} className="space-y-5 py-2">
      <div className="flex items-center gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `${cor}1a`, color: cor }}
        >
          <IconeSelecionado className="size-5.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" {...register("nome")} placeholder="Ex.: Conta Corrente" className="h-11" />
          {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={(v) => setValue("tipo", v as TipoConta)}>
          <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_CONTA.map((t) => (
              <SelectItem key={t} value={t}>
                {ROTULO_TIPO_CONTA[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tipo === "CARTAO" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="diaFechamento">Dia de fechamento</Label>
            <Input
              id="diaFechamento"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              {...register("diaFechamento")}
              placeholder="Ex.: 25"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diaVencimentoFatura">Dia de vencimento</Label>
            <Input
              id="diaVencimentoFatura"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              {...register("diaVencimentoFatura")}
              placeholder="Ex.: 5"
              className="h-11"
            />
          </div>
          <p className="col-span-2 text-nano text-ink-muted">
            Usados pra calcular em qual fatura cada compra cai.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="saldoInicial">Saldo inicial (R$)</Label>
        <Input
          id="saldoInicial"
          type="text"
          inputMode="decimal"
          {...register("saldoInicial")}
          placeholder="0,00"
          className="h-11"
        />
        <p className="text-nano text-ink-muted">
          Saldo da conta antes do primeiro lançamento registrado aqui.
        </p>
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

      {conta && aoExcluir && (
        <div className="rounded-xl border border-line p-3">
          {emUso ? (
            <p className="text-micro text-ink-muted">
              Usada em {conta.quantidadeMovimentacoes}{" "}
              {conta.quantidadeMovimentacoes === 1 ? "movimentação" : "movimentações"} — não pode
              ser excluída enquanto estiver em uso.
            </p>
          ) : confirmandoExclusao ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-micro text-ink">Excluir esta conta?</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmandoExclusao(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => aoExcluir(conta.id)}
                >
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
              Excluir conta
            </button>
          )}
        </div>
      )}
    </form>
  );
}
