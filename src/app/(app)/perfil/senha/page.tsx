import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Container } from "@/components/layout/container";
import { FormularioSenha } from "@/features/perfil/formulario-senha";
import { requireSessao } from "@/lib/sessao";

export default async function MudarSenhaPage() {
  await requireSessao();

  return (
    <Container className="max-w-[560px] space-y-4 pt-5">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-micro font-medium text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Meu perfil
      </Link>

      <h1 className="text-titulo font-semibold text-ink">Mudar senha</h1>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <FormularioSenha />
      </div>
    </Container>
  );
}
