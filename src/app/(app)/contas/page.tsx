import { Container } from "@/components/layout/container";
import { GerenciadorContas } from "@/features/contas/gerenciador-contas";
import { requireSessao } from "@/lib/sessao";
import { listarContas } from "@/services/contas";

export default async function ContasPage() {
  const { empresaAtiva } = await requireSessao();

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Contas</h1>
      <GerenciadorContas
        inicial={await listarContas(empresaAtiva.id)}
        somenteLeitura={empresaAtiva.papel === "LEITOR"}
      />
    </Container>
  );
}
