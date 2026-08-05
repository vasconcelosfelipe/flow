import { Container } from "@/components/layout/container";
import { GerenciadorCategorias } from "@/features/categorias/gerenciador-categorias";
import { requireSessao } from "@/lib/sessao";
import { listarCategorias } from "@/services/categorias";
import { listarLinhasDre } from "@/services/linhas-dre";

export default async function CategoriasPage() {
  const { empresaAtiva } = await requireSessao();

  const [categorias, linhas] = await Promise.all([
    listarCategorias(empresaAtiva.id),
    listarLinhasDre(),
  ]);

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Categorias</h1>
      <GerenciadorCategorias
        inicial={categorias}
        linhas={linhas}
        somenteLeitura={empresaAtiva.papel === "LEITOR"}
      />
    </Container>
  );
}
