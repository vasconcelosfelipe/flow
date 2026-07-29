import { Container } from "@/components/layout/container";
import { GerenciadorEmpresasConsole } from "@/features/console/gerenciador-empresas";
import { listarEmpresasConsole } from "@/services/console";

export default function ConsoleEmpresasPage() {
  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Empresas</h1>
      <GerenciadorEmpresasConsole inicial={listarEmpresasConsole()} />
    </Container>
  );
}
