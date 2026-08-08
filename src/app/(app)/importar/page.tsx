import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Container } from "@/components/layout/container";
import { WizardImportacao } from "@/features/importar/wizard-importacao";
import { requireSessao } from "@/lib/sessao";
import { listarCategorias } from "@/services/categorias";
import { listarContas } from "@/services/contas";
import { listarContatos } from "@/services/contatos";
import { listarLinhasDre } from "@/services/linhas-dre";

export default async function ImportarPage() {
  const { empresaAtiva } = await requireSessao();
  // Importar é 100% fluxo de escrita — sem uso de leitura possível, então
  // LEITOR nem entra, em vez de ver um wizard que só vai falhar no passo final.
  if (empresaAtiva.papel === "LEITOR") redirect("/sem-permissao");

  const [contas, categorias, contatos, linhas] = await Promise.all([
    listarContas(empresaAtiva.id),
    listarCategorias(empresaAtiva.id),
    listarContatos(empresaAtiva.id),
    listarLinhasDre(),
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
        categorias={categorias}
        contatos={contatos}
        linhas={linhas}
        tipoEspaco={empresaAtiva.tipo}
      />
    </Container>
  );
}
