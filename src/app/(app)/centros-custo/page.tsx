import { Container } from "@/components/layout/container";
import { GerenciadorCentrosCusto } from "@/features/centros-custo/gerenciador-centros-custo";
import { requireSessao } from "@/lib/sessao";
import { listarCentrosCusto } from "@/services/centros-custo";

export default async function CentrosCustoPage() {
  const { empresaAtiva } = await requireSessao();

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Centros de custo</h1>
      <GerenciadorCentrosCusto
        inicial={await listarCentrosCusto(empresaAtiva.id)}
        somenteLeitura={empresaAtiva.papel === "LEITOR"}
      />
    </Container>
  );
}
