import { Building2 } from "lucide-react";

import { ROTULO_PAPEL } from "@/types/dominio";
import type { UsuarioConsole } from "@/services/console/dto";

/** Só leitura: mudar o papel de alguém numa empresa é ação de quem administra
 * aquela empresa, não do Console — aqui só se vê o retrato de acesso. */
export function DetalheUsuarioConsole({ usuario }: { usuario: UsuarioConsole }) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <p className="text-titulo font-semibold text-ink">{usuario.nome}</p>
        <p className="text-micro text-ink-muted">{usuario.email}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-nano font-medium tracking-wide text-ink-muted uppercase">Empresas</p>
        {usuario.empresas.length === 0 ? (
          <p className="text-micro text-ink-muted">Nenhuma empresa vinculada.</p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {usuario.empresas.map((m) => (
              <div key={m.empresaId} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-wash text-brand">
                  <Building2 className="size-4" aria-hidden="true" />
                </span>
                <span className="flex-1 text-corpo text-ink">{m.empresaNome}</span>
                <span className="text-nano font-medium text-ink-muted">{ROTULO_PAPEL[m.papel]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
