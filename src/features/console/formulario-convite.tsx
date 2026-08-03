"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROTULO_PAPEL, type PapelMembro } from "@/types/dominio";
import type { EmpresaConsole, FormularioConviteUsuario } from "@/services/console/dto";

export const FORM_ID_CONVITE = "form-convite";

const PAPEIS = Object.keys(ROTULO_PAPEL) as PapelMembro[];

const schema = z.object({
  nome: z.string().trim().min(2, "Digite ao menos 2 letras.").max(60),
  email: z.string().trim().email("Digite um e-mail válido."),
  empresaId: z.string().min(1, "Escolha uma empresa."),
  papel: z.enum(["DONO", "ADMIN", "MEMBRO", "LEITOR"]),
});

export function FormularioConvite({
  empresas,
  aoConvidar,
}: {
  empresas: EmpresaConsole[];
  aoConvidar: (dados: FormularioConviteUsuario) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", email: "", empresaId: "", papel: "MEMBRO" },
  });

  const empresaId = watch("empresaId");
  const papel = watch("papel");

  return (
    <form id={FORM_ID_CONVITE} onSubmit={handleSubmit(aoConvidar)} className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register("nome")} placeholder="Ex.: Camila Rocha" className="h-11" />
        {errors.nome && <p className="text-nano text-negative-text">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register("email")} placeholder="nome@empresa.com.br" className="h-11" />
        {errors.email && <p className="text-nano text-negative-text">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Empresa</Label>
        <Select value={empresaId} onValueChange={(v) => setValue("empresaId", v)}>
          <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
            <SelectValue placeholder="Escolha a empresa" />
          </SelectTrigger>
          <SelectContent>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.empresaId && <p className="text-nano text-negative-text">{errors.empresaId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Papel</Label>
        <Select value={papel} onValueChange={(v) => setValue("papel", v as PapelMembro)}>
          <SelectTrigger className="h-11 w-full rounded-lg border-line bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAPEIS.map((p) => (
              <SelectItem key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}
