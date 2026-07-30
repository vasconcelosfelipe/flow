import { Container } from "@/components/layout/container";
import { FormularioPerfil } from "@/features/perfil/formulario-perfil";
import { requireSessao } from "@/lib/sessao";

export default async function PerfilPage() {
  const sessao = await requireSessao();

  return (
    <Container className="max-w-[560px] space-y-4 pt-5">
      <h1 className="text-titulo font-semibold text-ink">Meu perfil</h1>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <FormularioPerfil usuario={sessao.usuario} />
      </div>
    </Container>
  );
}
