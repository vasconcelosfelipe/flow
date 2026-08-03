"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarDocumento, validarDocumento } from "@/lib/documentos";
import type { ContatoCompleto, FormularioContato } from "@/services/contatos/dto";

export const FORM_ID_CONTATO = "form-contato";

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(60),
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
}: {
  contato: ContatoCompleto | null;
  aoSalvar: (dados: FormularioContato) => void;
  aoExcluir?: (id: string) => void;
}) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: contato?.nome ?? "",
      documento: contato?.documento ? formatarDocumento(contato.documento) : "",
    },
  });

  function enviar(dados: z.infer<typeof schema>) {
    // Guarda só dígitos — a máscara é responsabilidade da exibição, não do dado.
    const documento = dados.documento ? dados.documento.replace(/\D/g, "") : null;
    aoSalvar({ id: contato?.id, nome: dados.nome, documento });
  }

  const emUso = (contato?.quantidadeMovimentacoes ?? 0) > 0;

  return (
    <form id={FORM_ID_CONTATO} onSubmit={handleSubmit(enviar)} className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register("nome")} placeholder="Ex.: Distribuidora Central" className="h-11" />
        {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
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
          className="h-11"
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
              <p className="text-micro text-ink">Excluir este fornecedor/cliente?</p>
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
              Excluir fornecedor/cliente
            </button>
          )}
        </div>
      )}
    </form>
  );
}
