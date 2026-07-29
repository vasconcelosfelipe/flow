import { requireSessao } from "@/lib/sessao";
import { SelecionarEmpresaCliente } from "./selecionar-empresa-cliente";

export default async function SelecionarEmpresaPage() {
  const { empresas } = await requireSessao();

  return <SelecionarEmpresaCliente empresas={empresas} />;
}
