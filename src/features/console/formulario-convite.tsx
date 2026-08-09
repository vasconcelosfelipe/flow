"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROTULO_PAPEL, type PapelMembro } from "@/types/dominio";
import type { EmpresaConsole, FormularioConviteUsuario } from "@/services/console/dto";

export const FORM_ID_CONVITE = "form-convite";

const PAPEIS = Object.keys(ROTULO_PAPEL) as PapelMembro[];

const schema = z.object({
  email: z.string().trim().email("Digite um e-mail válido."),
  empresaId: z.string().min(1, "Escolha um espaço."),
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
    defaultValues: { email: "", empresaId: "", papel: "MEMBRO" },
  });

  const empresaId = watch("empresaId");
  const papel = watch("papel");
  const [modalAberto, setModalAberto] = useState<"espaco" | "papel" | null>(null);

  return (
    <form id={FORM_ID_CONVITE} onSubmit={handleSubmit(aoConvidar)} className="space-y-5 py-2 pb-6">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register("email")} placeholder="nome@empresa.com.br" className="h-11" />
        {errors.email && <p className="text-nano text-negative-text">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Espaço</Label>
        <GatilhoSelecao
          label={empresas.find((e) => e.id === empresaId)?.nome ?? null}
          placeholder="Escolha o espaço"
          onClick={() => setModalAberto("espaco")}
        />
        {errors.empresaId && <p className="text-nano text-negative-text">{errors.empresaId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Papel</Label>
        <GatilhoSelecao
          label={ROTULO_PAPEL[papel]}
          placeholder="Escolher papel"
          onClick={() => setModalAberto("papel")}
        />
      </div>

      <SeletorListaModal
        aberto={modalAberto === "espaco"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Espaço"
        value={empresaId}
        onValueChange={(v) => setValue("empresaId", v, { shouldValidate: true })}
        opcoes={empresas.map((e) => ({ value: e.id, label: e.nome }))}
      />

      <SeletorListaModal
        aberto={modalAberto === "papel"}
        aoMudarAberto={(a) => !a && setModalAberto(null)}
        titulo="Papel"
        value={papel}
        onValueChange={(v) => setValue("papel", v as PapelMembro)}
        opcoes={PAPEIS.map((p) => ({ value: p, label: ROTULO_PAPEL[p] }))}
        buscavel={false}
      />
    </form>
  );
}
