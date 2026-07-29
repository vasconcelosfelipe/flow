import { Container } from "@/components/layout/container";
import { GerenciadorCategorias } from "@/features/categorias/gerenciador-categorias";
import { listarCategorias } from "@/services/categorias";

export default function CategoriasPage() {
  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Categorias</h1>
      <GerenciadorCategorias inicial={listarCategorias()} />
    </Container>
  );
}
