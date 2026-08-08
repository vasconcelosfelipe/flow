"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { FormularioCompraCartao } from "@/features/contas/formulario-compra-cartao";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

const FORM_ID = "form-nova-compra-cartao";

/** Botão "Nova compra" da tela de um cartão específico — a conta já vem
 * fixa, então `FormularioCompraCartao` nem mostra o seletor de cartão. */
export function BotaoNovaCompraCartao({
  contaId,
  contaNome,
  categorias,
  contatos,
  linhas,
  tipoEspaco,
}: {
  contaId: string;
  contaNome: string;
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, setPending] = useState(false);

  function fechar() {
    setAberto(false);
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Nova compra
      </Button>

      <ResponsiveModal
        aberto={aberto}
        aoMudarAberto={(v) => !v && fechar()}
        titulo="Nova compra"
        descricao="Registre uma compra no cartão — a fatura em que ela cai é calculada sozinha."
        rodape={
          <>
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={fechar}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} size="lg" className="flex-1" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        {aberto && (
          <FormularioCompraCartao
            formId={FORM_ID}
            contas={[{ id: contaId, nome: contaNome }]}
            categorias={categorias}
            contatos={contatos}
            linhas={linhas}
            tipoEspaco={tipoEspaco}
            aoPendingChange={setPending}
            aoSalvar={() => {
              fechar();
              router.refresh();
            }}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
