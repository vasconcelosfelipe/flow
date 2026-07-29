import { Container } from "@/components/layout/container";
import { GerenciadorContas } from "@/features/contas/gerenciador-contas";
import { listarContas } from "@/services/contas";

export default function ContasPage() {
  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Contas</h1>
      <GerenciadorContas inicial={listarContas()} />
    </Container>
  );
}
