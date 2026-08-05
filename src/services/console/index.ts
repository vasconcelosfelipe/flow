import { db } from "@/lib/db";
import type { ConvitePendente, EmpresaConsole, UsuarioConsole } from "@/services/console/dto";

export async function listarEmpresasConsole(): Promise<EmpresaConsole[]> {
  const empresas = await db.empresa.findMany({
    orderBy: { criadoEm: "asc" },
    include: { _count: { select: { membros: true } } },
  });

  return empresas.map((e) => ({
    id: e.id,
    nome: e.nome,
    slug: e.slug,
    cnpj: e.cnpj,
    ativa: true,
    quantidadeUsuarios: e._count.membros,
    criadaEm: e.criadoEm,
  }));
}

export async function listarUsuariosConsole(): Promise<UsuarioConsole[]> {
  const usuarios = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      membros: { include: { empresa: true }, orderBy: { criadoEm: "asc" } },
    },
  });

  return usuarios.map((u) => ({
    id: u.id,
    nome: u.name,
    email: u.email,
    adminPlataforma: u.adminPlataforma,
    empresas: u.membros.map((m) => ({
      empresaId: m.empresaId,
      empresaNome: m.empresa.nome,
      papel: m.papel as import("@/types/dominio").PapelMembro,
    })),
  }));
}

/** Convites ainda não aceitos e ainda não expirados — os expirados somem
 * da lista sozinhos (não precisam de limpeza manual), reenviar cria um
 * novo convite por cima. */
export async function listarConvitesPendentes(): Promise<ConvitePendente[]> {
  const convites = await db.convite.findMany({
    where: { aceitoEm: null, expiraEm: { gt: new Date() } },
    include: { empresa: true },
    orderBy: { criadoEm: "desc" },
  });

  return convites.map((c) => ({
    id: c.id,
    email: c.email,
    empresaNome: c.empresa.nome,
    papel: c.papel as import("@/types/dominio").PapelMembro,
    expiraEm: c.expiraEm,
  }));
}
