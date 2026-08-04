"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { DetalheUsuarioConsole } from "@/features/console/detalhe-usuario";
import { FORM_ID_CONVITE, FormularioConvite } from "@/features/console/formulario-convite";
import { LinhaUsuarioConsole } from "@/features/console/linha-usuario";
import type {
  EmpresaConsole,
  FormularioConviteUsuario,
  UsuarioConsole,
} from "@/services/console/dto";

export function GerenciadorUsuariosConsole({
  inicial,
  empresas,
}: {
  inicial: UsuarioConsole[];
  empresas: EmpresaConsole[];
}) {
  const [usuarios, setUsuarios] = useState(inicial);
  const [visualizando, setVisualizando] = useState<UsuarioConsole | null>(null);
  const [convidando, setConvidando] = useState(false);

  function convidar(dados: FormularioConviteUsuario) {
    const empresa = empresas.find((e) => e.id === dados.empresaId);
    if (!empresa) return;

    const novo: UsuarioConsole = {
      id: `usr_custom_${Date.now()}`,
      nome: dados.nome,
      email: dados.email,
      adminPlataforma: false,
      empresas: [{ empresaId: empresa.id, empresaNome: empresa.nome, papel: dados.papel }],
    };
    setUsuarios((atuais) => [...atuais, novo]);
    setConvidando(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setConvidando(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Convidar
        </Button>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState icone={Users} titulo="Nenhum usuário" descricao="Convide a primeira pessoa para a plataforma." />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {usuarios.map((usuario) => (
            <LinhaUsuarioConsole
              key={usuario.id}
              usuario={usuario}
              aoAbrir={(id) => setVisualizando(usuarios.find((u) => u.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        aberto={visualizando !== null}
        aoMudarAberto={(aberto) => !aberto && setVisualizando(null)}
        titulo="Usuário"
        descricao="Empresas e papéis deste usuário."
        rodape={
          <Button variant="outline" className="w-full" onClick={() => setVisualizando(null)}>
            Fechar
          </Button>
        }
      >
        {visualizando && <DetalheUsuarioConsole usuario={visualizando} todasEmpresas={empresas} />}
      </ResponsiveModal>

      <ResponsiveModal
        aberto={convidando}
        aoMudarAberto={setConvidando}
        titulo="Convidar usuário"
        descricao="Nome, e-mail, empresa e papel do convite."
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConvidando(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID_CONVITE} className="flex-1">
              Convidar
            </Button>
          </>
        }
      >
        <FormularioConvite empresas={empresas} aoConvidar={convidar} />
      </ResponsiveModal>
    </div>
  );
}
