import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Container } from "@/components/layout/container";
import { WizardImportacao } from "@/features/importar/wizard-importacao";
import { requireSessao } from "@/lib/sessao";
import { listarCategorias } from "@/services/categorias";
import { listarContas } from "@/services/contas";
import { listarContatos } from "@/services/contatos";

export default async function ImportarPage() {
  const { empresaAtiva } = await requireSessao();
  const [contas, categorias, contatos] = await Promise.all([
    listarContas(empresaAtiva.id),
    listarCategorias(empresaAtiva.id),
    listarContatos(empresaAtiva.id),
  ]);

  return (
    <Container className="space-y-4 pt-5">
      <Link
        href="/movimentacoes"
        className="inline-flex items-center gap-1 text-micro font-medium text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Movimentações
      </Link>

      <h1 className="text-titulo font-semibold text-ink">Importar extrato</h1>
      <WizardImportacao
        contas={contas.map((c) => ({ id: c.id, nome: c.nome }))}
        categorias={categorias.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }))}
        contatos={contatos.map((c) => ({ id: c.id, nome: c.nome }))}
      />
    </Container>
  );
}
