import { Container } from "@/components/layout/container";
import { GerenciadorUsuariosConsole } from "@/features/console/gerenciador-usuarios";
import { listarEmpresasConsole, listarUsuariosConsole } from "@/services/console";

export default async function ConsoleUsuariosPage() {
  const [usuarios, empresas] = await Promise.all([
    listarUsuariosConsole(),
    listarEmpresasConsole(),
  ]);

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Usuários</h1>
      <GerenciadorUsuariosConsole inicial={usuarios} empresas={empresas} />
    </Container>
  );
}
