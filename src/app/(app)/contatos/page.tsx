import { Container } from "@/components/layout/container";
import { GerenciadorContatos } from "@/features/contatos/gerenciador-contatos";
import { requireSessao } from "@/lib/sessao";
import { listarContatos } from "@/services/contatos";

export default async function ContatosPage() {
  const { empresaAtiva } = await requireSessao();

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Fornecedores/Clientes</h1>
      <GerenciadorContatos inicial={await listarContatos(empresaAtiva.id)} />
    </Container>
  );
}
