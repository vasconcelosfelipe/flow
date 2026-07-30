"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatarDocumento, validarDocumento } from "@/lib/documentos";
import { ROTULO_TIPO_CONTATO, type TipoContato } from "@/types/dominio";
import type { ContatoCompleto, FormularioContato } from "@/services/contatos/dto";

const TIPOS_CONTATO = Object.keys(ROTULO_TIPO_CONTATO) as TipoContato[];

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(60),
  tipo: z.enum(["CLIENTE", "FORNECEDOR", "AMBOS"]),
  documento: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || validarDocumento(v), "CPF ou CNPJ inválido."),
});

/**
 * Um único formulário para criar e editar — a diferença entre os dois casos
 * é só ter ou não `contato` de partida, nunca uma tela separada.
 */
export function FormularioContato({
  contato,
  aoSalvar,
  aoExcluir,
  aoCancelar,
}: {
  contato: ContatoCompleto | null;
  aoSalvar: (dados: FormularioContato) => void;
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
      nome: contato?.nome ?? "",
      tipo: contato?.tipo ?? "CLIENTE",
      documento: contato?.documento ? formatarDocumento(contato.documento) : "",
    },
  });

  const tipo = watch("tipo");

  function enviar(dados: z.infer<typeof schema>) {
    // Guarda só dígitos — a máscara é responsabilidade da exibição, não do dado.
    const documento = dados.documento ? dados.documento.replace(/\D/g, "") : null;
    aoSalvar({ id: contato?.id, nome: dados.nome, tipo: dados.tipo, documento });
  }

  const emUso = (contato?.quantidadeMovimentacoes ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit(enviar)} className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register("nome")} placeholder="Ex.: Distribuidora Central" className="h-10" />
        {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS_CONTATO.map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setValue("tipo", valor)}
              className={cn(
                "h-10 rounded-lg border px-1 text-micro font-medium transition-colors",
                tipo === valor
                  ? "border-brand bg-brand-wash text-brand"
                  : "border-line text-ink-muted hover:bg-muted",
              )}
            >
              {ROTULO_TIPO_CONTATO[valor]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="documento">CPF ou CNPJ</Label>
        <Input
          id="documento"
          {...register("documento")}
          onChange={(e) =>
            setValue("documento", formatarDocumento(e.target.value), { shouldValidate: true })
          }
          placeholder="Opcional"
          inputMode="numeric"
          className="h-10"
        />
        {errors.documento && <p className="text-nano text-negative-text">{errors.documento.message}</p>}
      </div>

      {contato && aoExcluir && (
        <div className="rounded-xl border border-line p-3">
          {emUso ? (
            <p className="text-micro text-ink-muted">
              Usado em {contato.quantidadeMovimentacoes}{" "}
              {contato.quantidadeMovimentacoes === 1 ? "movimentação" : "movimentações"} — não pode
              ser excluído enquanto estiver em uso.
            </p>
          ) : confirmandoExclusao ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-micro text-ink">Excluir este contato?</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmandoExclusao(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => aoExcluir(contato.id)}>
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
              Excluir contato
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
