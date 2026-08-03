"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PowerOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarCnpj, validarCnpj } from "@/lib/documentos";
import type { EmpresaConsole, FormularioEmpresaConsole } from "@/services/console/dto";

export const FORM_ID_EMPRESA = "form-empresa";

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(60),
  slug: z
    .string()
    .trim()
    .min(2, "Digite ao menos 2 letras.")
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen."),
  cnpj: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || validarCnpj(v), "CNPJ inválido."),
});

/**
 * Cadastrar uma empresa aqui é diferente de qualquer outro formulário do
 * produto: não pertence a uma empresa, cria uma. Por isso pede o slug (a
 * URL que a empresa vai usar) e não tem cor nem ícone — nada de identidade
 * visual, só os dados que a fazem existir na plataforma.
 */
export function FormularioEmpresa({
  empresa,
  aoSalvar,
  aoAlternarAtiva,
}: {
  empresa: EmpresaConsole | null;
  aoSalvar: (dados: FormularioEmpresaConsole) => void;
  aoAlternarAtiva?: (id: string) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: empresa?.nome ?? "",
      slug: empresa?.slug ?? "",
      cnpj: empresa?.cnpj ? formatarCnpj(empresa.cnpj) : "",
    },
  });

  function enviar(dados: z.infer<typeof schema>) {
    // Guarda só dígitos — a máscara é responsabilidade da exibição, não do dado.
    const cnpj = dados.cnpj ? dados.cnpj.replace(/\D/g, "") : null;
    aoSalvar({ id: empresa?.id, nome: dados.nome, slug: dados.slug, cnpj });
  }

  return (
    <form id={FORM_ID_EMPRESA} onSubmit={handleSubmit(enviar)} className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome da empresa</Label>
        <Input id="nome" {...register("nome")} placeholder="Ex.: Aurora Comércio" className="h-11" />
        {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" {...register("slug")} placeholder="Ex.: aurora" className="h-11" />
        {errors.slug ? (
          <p className="text-nano text-negative-text">{errors.slug.message}</p>
        ) : (
          <p className="text-nano text-ink-muted">Usado para identificar a empresa em links e integrações.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          {...register("cnpj")}
          onChange={(e) => setValue("cnpj", formatarCnpj(e.target.value), { shouldValidate: true })}
          placeholder="Opcional"
          inputMode="numeric"
          className="h-11"
        />
        {errors.cnpj && <p className="text-nano text-negative-text">{errors.cnpj.message}</p>}
      </div>

      {empresa && aoAlternarAtiva && (
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-micro font-medium text-ink">
                {empresa.ativa ? "Empresa ativa" : "Empresa inativa"}
              </p>
              <p className="text-nano text-ink-muted">
                {empresa.ativa
                  ? "Desativar impede novos acessos sem apagar os dados."
                  : "Reative para liberar o acesso novamente."}
              </p>
            </div>
            <Button
              type="button"
              variant={empresa.ativa ? "destructive" : "outline"}
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => aoAlternarAtiva(empresa.id)}
            >
              <PowerOff className="size-3.5" aria-hidden="true" />
              {empresa.ativa ? "Desativar" : "Reativar"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
