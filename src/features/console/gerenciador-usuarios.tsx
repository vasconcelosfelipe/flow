"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, Plus, Users, X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { DetalheUsuarioConsole } from "@/features/console/detalhe-usuario";
import { FORM_ID_CONVITE, FormularioConvite } from "@/features/console/formulario-convite";
import { LinhaUsuarioConsole } from "@/features/console/linha-usuario";
import { cancelarConvite, convidarUsuario } from "@/services/console/actions";
import { ROTULO_PAPEL } from "@/types/dominio";
import type {
  ConvitePendente,
  EmpresaConsole,
  FormularioConviteUsuario,
  UsuarioConsole,
} from "@/services/console/dto";

export function GerenciadorUsuariosConsole({
  inicial,
  empresas,
  convitesIniciais,
}: {
  inicial: UsuarioConsole[];
  empresas: EmpresaConsole[];
  convitesIniciais: ConvitePendente[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [visualizando, setVisualizando] = useState<UsuarioConsole | null>(null);
  const [convidando, setConvidando] = useState(false);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  function convidar(dados: FormularioConviteUsuario) {
    setErroConvite(null);
    startTransition(async () => {
      try {
        await convidarUsuario(dados);
        setConvidando(false);
        router.refresh();
      } catch (e) {
        setErroConvite(e instanceof Error ? e.message : "Não deu pra enviar o convite.");
      }
    });
  }

  function cancelar(id: string) {
    startTransition(async () => {
      await cancelarConvite(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setConvidando(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Convidar
        </Button>
      </div>

      {convitesIniciais.length > 0 && (
        <div className="space-y-2">
          <p className="text-nano font-medium tracking-wide text-ink-muted uppercase">
            Convites pendentes
          </p>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {convitesIniciais.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-attention-wash text-attention-text">
                  <Mail className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-corpo text-ink">{c.email}</span>
                  <span className="block truncate text-nano text-ink-muted">
                    {c.empresaNome} · {ROTULO_PAPEL[c.papel]}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => cancelar(c.id)}
                  disabled={pending}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-negative/10 hover:text-negative-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40"
                  aria-label={`Cancelar convite de ${c.email}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {inicial.length === 0 ? (
        <EmptyState icone={Users} titulo="Nenhum usuário" descricao="Convide a primeira pessoa para a plataforma." />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {inicial.map((usuario) => (
            <LinhaUsuarioConsole
              key={usuario.id}
              usuario={usuario}
              aoAbrir={(id) => setVisualizando(inicial.find((u) => u.id === id) ?? null)}
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
        aoMudarAberto={(v) => { setConvidando(v); if (!v) setErroConvite(null); }}
        titulo="Convidar usuário"
        descricao="E-mail, empresa e papel do convite."
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
            <Button type="submit" form={FORM_ID_CONVITE} className="flex-1" disabled={pending}>
              {pending ? "Enviando…" : "Convidar"}
            </Button>
          </>
        }
      >
        <FormularioConvite empresas={empresas} aoConvidar={convidar} />
        {erroConvite && (
          <p className="mt-2 rounded-lg bg-negative/10 px-3 py-2 text-nano text-negative-text">
            {erroConvite}
          </p>
        )}
      </ResponsiveModal>
    </div>
  );
}
