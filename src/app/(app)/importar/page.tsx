import { Container } from "@/components/layout/container";
import { WizardImportacao } from "@/features/importar/wizard-importacao";

export default function ImportarPage() {
  return (
    <Container className="space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Importar extrato</h1>
      <WizardImportacao />
    </Container>
  );
}
