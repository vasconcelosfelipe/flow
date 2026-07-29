import { Container } from "@/components/layout/container";
import { GerenciadorContatos } from "@/features/contatos/gerenciador-contatos";
import { listarContatos } from "@/services/contatos";

export default function ContatosPage() {
  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Contatos</h1>
      <GerenciadorContatos inicial={listarContatos()} />
    </Container>
  );
}
