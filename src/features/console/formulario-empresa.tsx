"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PowerOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarCnpj, validarCnpj } from "@/lib/documentos";
import { cn } from "@/lib/utils";
import { excluirEmpresa } from "@/services/console/actions";
import type { EmpresaConsole, FormularioEmpresaConsole } from "@/services/console/dto";
import { ROTULO_TIPO_EMPRESA, type TipoEmpresa } from "@/types/dominio";

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
  tipo: z.enum(["EMPRESA", "PESSOA_FISICA"]),
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
  aoExcluir,
}: {
  empresa: EmpresaConsole | null;
  aoSalvar: (dados: FormularioEmpresaConsole) => void;
  aoAlternarAtiva?: (id: string) => void;
  /** Chamado depois que a empresa é apagada de verdade — fecha o modal. */
  aoExcluir?: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: empresa?.nome ?? "",
      slug: empresa?.slug ?? "",
      cnpj: empresa?.cnpj ? formatarCnpj(empresa.cnpj) : "",
      tipo: empresa?.tipo ?? "EMPRESA",
    },
  });

  const tipo = watch("tipo");

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [nomeDigitado, setNomeDigitado] = useState("");
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [excluindo, startExclusao] = useTransition();

  function enviar(dados: z.infer<typeof schema>) {
    // Guarda só dígitos — a máscara é responsabilidade da exibição, não do dado.
    const cnpj = dados.cnpj ? dados.cnpj.replace(/\D/g, "") : null;
    aoSalvar({ id: empresa?.id, nome: dados.nome, slug: dados.slug, cnpj, tipo: dados.tipo });
  }

  function excluir() {
    if (!empresa || !aoExcluir) return;
    setErroExclusao(null);
    startExclusao(async () => {
      try {
        await excluirEmpresa(empresa.id, nomeDigitado);
        aoExcluir();
      } catch (e) {
        setErroExclusao(e instanceof Error ? e.message : "Não deu pra excluir.");
      }
    });
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

      <div className="space-y-1.5">
        <Label>Tipo de espaço</Label>
        <div className="flex gap-2">
          {(Object.keys(ROTULO_TIPO_EMPRESA) as TipoEmpresa[]).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setValue("tipo", opcao, { shouldValidate: true })}
              className={cn(
                "h-11 flex-1 rounded-xl border text-micro font-medium transition-colors",
                tipo === opcao
                  ? "border-brand bg-brand-wash text-brand"
                  : "border-line text-ink-muted hover:bg-muted",
              )}
            >
              {ROTULO_TIPO_EMPRESA[opcao]}
            </button>
          ))}
        </div>
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

      {empresa && aoExcluir && (
        <div className="rounded-xl border border-negative/30 bg-negative/5 p-3">
          {confirmandoExclusao ? (
            <div className="space-y-3">
              <p className="text-micro text-ink">
                Isso vai apagar <strong>{empresa.nome}</strong> e tudo dela: movimentações,
                contas, categorias, contatos e o acesso de todos os usuários vinculados. Não
                pode ser desfeito.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="confirmacao-nome">
                  Digite <strong>{empresa.nome}</strong> para confirmar
                </Label>
                <Input
                  id="confirmacao-nome"
                  value={nomeDigitado}
                  onChange={(e) => setNomeDigitado(e.target.value)}
                  className="h-11"
                  autoComplete="off"
                />
              </div>
              {erroExclusao && <p className="text-nano text-negative-text">{erroExclusao}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setConfirmandoExclusao(false);
                    setNomeDigitado("");
                    setErroExclusao(null);
                  }}
                  disabled={excluindo}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 border-transparent bg-negative text-white hover:bg-negative/90"
                  onClick={excluir}
                  disabled={excluindo || nomeDigitado.trim() !== empresa.nome}
                >
                  {excluindo ? "Excluindo…" : "Excluir definitivamente"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-micro font-medium text-ink">Excluir empresa</p>
                <p className="text-nano text-ink-muted">Apaga tudo. Não pode ser desfeito.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setConfirmandoExclusao(true)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
