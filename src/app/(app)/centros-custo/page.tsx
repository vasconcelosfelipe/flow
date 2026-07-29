import { Container } from "@/components/layout/container";
import { GerenciadorCentrosCusto } from "@/features/centros-custo/gerenciador-centros-custo";
import { listarCentrosCusto } from "@/services/centros-custo";

export default function CentrosCustoPage() {
  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Centros de custo</h1>
      <GerenciadorCentrosCusto inicial={listarCentrosCusto()} />
    </Container>
  );
}
