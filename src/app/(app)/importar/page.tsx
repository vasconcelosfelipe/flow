import { Container } from "@/components/layout/container";
import { WizardImportacao } from "@/features/importar/wizard-importacao";
import { requireSessao } from "@/lib/sessao";
import { listarContas } from "@/services/contas";

export default async function ImportarPage() {
  const { empresaAtiva } = await requireSessao();
  const contas = await listarContas(empresaAtiva.id);

  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Importar extrato</h1>
      <WizardImportacao contas={contas.map((c) => ({ id: c.id, nome: c.nome }))} />
    </Container>
  );
}
