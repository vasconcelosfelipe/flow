"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Building2, ChevronRight } from "lucide-react";

import { selecionarEmpresa } from "@/services/empresas/actions";
import { ROTULO_PAPEL } from "@/types/dominio";
import type { EmpresaResumo } from "@/services/empresas/dto";

export function SelecionarEmpresaCliente({ empresas }: { empresas: EmpresaResumo[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function escolher(slug: string) {
    startTransition(async () => {
      await selecionarEmpresa(slug);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="text-titulo font-semibold text-night-text">Escolha uma empresa</h1>
      <p className="mt-1 text-micro text-night-muted">
        Você tem acesso a {empresas.length} {empresas.length === 1 ? "empresa" : "empresas"}.
      </p>

      <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-night">
        {empresas.map((empresa) => (
          <button
            key={empresa.id}
            type="button"
            disabled={pending}
            onClick={() => escolher(empresa.slug)}
            className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
              <Building2 className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-corpo font-medium text-ink">{empresa.nome}</span>
              <span className="block truncate text-nano text-ink-muted">
                {ROTULO_PAPEL[empresa.papel]}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
