import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { SessaoAtual } from "@/services/empresas/dto";

/**
 * Resolve a sessão do usuário atual a partir dos cookies.
 * Redireciona para /login se não autenticado.
 * Uso: `const sessao = await requireSessao()` em Server Components e Actions.
 */
export async function requireSessao(empresaSlug?: string): Promise<SessaoAtual> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");

  const { user } = session;

  // Busca empresas do usuário com papel
  const membros = await db.membroEmpresa.findMany({
    where: { userId: user.id },
    include: { empresa: true },
    orderBy: { criadoEm: "asc" },
  });

  if (membros.length === 0) {
    // Usuário sem empresa — só adminPlataforma pode acessar o console
    if (!user.adminPlataforma) redirect("/sem-empresa");
    // Admin sem empresa: devolve sessão mínima sem empresa ativa
    return {
      usuario: {
        id: user.id,
        nome: user.name,
        email: user.email,
        adminPlataforma: user.adminPlataforma ?? false,
      },
      empresaAtiva: null as never,
      empresas: [],
    };
  }

  const empresas = membros.map((m) => ({
    id: m.empresa.id,
    nome: m.empresa.nome,
    slug: m.empresa.slug,
    cnpj: m.empresa.cnpj,
    papel: m.papel,
  }));

  // Resolve empresa ativa: slug da URL > primeira da lista
  const ativa =
    (empresaSlug ? empresas.find((e) => e.slug === empresaSlug) : null) ??
    empresas[0];

  return {
    usuario: {
      id: user.id,
      nome: user.name,
      email: user.email,
      adminPlataforma: user.adminPlataforma ?? false,
    },
    empresaAtiva: ativa,
    empresas,
  };
}
