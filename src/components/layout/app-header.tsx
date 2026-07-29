import Link from "next/link";
import { Settings2 } from "lucide-react";

import { EmpresaSwitcher } from "@/components/layout/empresa-switcher";
import { LogoMark } from "@/components/layout/logo";
import type { SessaoAtual } from "@/services/empresas/dto";

/**
 * Barra superior escura — o cromo do produto.
 *
 * O escuro não é enfeite: separa o que é aplicação do que é conteúdo. Tudo que
 * é comando (marca, empresa, ajustes) vive no escuro; tudo que é dado vive no
 * claro. Quem olha a tela sabe onde está sem ler.
 *
 * Sem borda inferior de propósito: contra o canvas claro o contraste já separa,
 * e contra a zona escura do Início a barra precisa costurar sem emenda.
 */
export function AppHeader({ sessao }: { sessao: SessaoAtual }) {
  return (
    // z-50: acima de qualquer camada da onda de fundo do Início (até z-40) —
    // sem isso, uma seção com z-index igual ou maior passaria por cima do
    // cabeçalho fixo ao rolar a página.
    <header className="pt-safe sticky top-0 z-50 bg-night text-night-text">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-2 px-4">
        <Link
          href="/"
          className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none md:hidden"
        >
          <LogoMark className="size-7" />
          <span className="sr-only">Flow — início</span>
        </Link>

        <div className="min-w-0 flex-1">
          <EmpresaSwitcher
            empresas={sessao.empresas}
            ativa={sessao.empresaAtiva}
            mostrarConsole={sessao.usuario.adminPlataforma}
          />
        </div>

        <Link
          href="/mais"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-night-muted transition-colors hover:bg-white/10 hover:text-night-text focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <Settings2 className="size-4.5" aria-hidden="true" />
          <span className="sr-only">Ajustes</span>
        </Link>
      </div>
    </header>
  );
}
