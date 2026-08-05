"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { enviarEmail } from "@/lib/email";
import { requireSessao } from "@/lib/sessao";
import { ROTULO_PAPEL, type PapelMembro } from "@/types/dominio";

const VALIDADE_CONVITE_DIAS = 7;

async function verificarAdmin() {
  const sessao = await requireSessao();
  if (!sessao.usuario.adminPlataforma) throw new Error("Não autorizado");
  return sessao;
}

export async function criarEmpresa(dados: { nome: string; slug: string; cnpj?: string | null }) {
  const sessao = await verificarAdmin();
  const empresa = await db.empresa.create({ data: { nome: dados.nome, slug: dados.slug, cnpj: dados.cnpj } });
  // Auto-atribui o admin criador como ADMIN da empresa
  await db.membroEmpresa.create({ data: { userId: sessao.usuario.id, empresaId: empresa.id, papel: "ADMIN" } });
  revalidatePath("/console/empresas");
}

export async function editarEmpresa(id: string, dados: { nome: string; slug: string; cnpj?: string | null }) {
  await verificarAdmin();
  await db.empresa.update({ where: { id }, data: { nome: dados.nome, slug: dados.slug, cnpj: dados.cnpj } });
  revalidatePath("/console/empresas");
}

export async function alternarEmpresaAtiva(id: string) {
  await verificarAdmin();
  const empresa = await db.empresa.findUniqueOrThrow({ where: { id }, select: { ativa: true } });
  await db.empresa.update({ where: { id }, data: { ativa: !empresa.ativa } });
  revalidatePath("/console/empresas");
}

/**
 * Apaga a empresa e tudo que pende dela (movimentações, contas, categorias,
 * contatos, vínculos de usuário, convites, importações — todo relaciona-
 * mento com `Empresa` no schema é `onDelete: Cascade`). Irreversível, por
 * isso exige digitar o nome exato da empresa — validado aqui, não só na UI,
 * porque confiar só no cliente deixaria a confirmação furável.
 */
export async function excluirEmpresa(id: string, confirmacaoNome: string) {
  await verificarAdmin();
  const empresa = await db.empresa.findUniqueOrThrow({ where: { id }, select: { nome: true } });
  if (confirmacaoNome.trim() !== empresa.nome) {
    throw new Error("O nome digitado não confere com o nome da empresa.");
  }
  await db.empresa.delete({ where: { id } });
  revalidatePath("/console/empresas");
  revalidatePath("/console/usuarios");
}

export async function atribuirEmpresa(
  userId: string,
  empresaId: string,
  papel: PapelMembro,
) {
  await verificarAdmin();

  await db.membroEmpresa.upsert({
    where: { empresaId_userId: { empresaId, userId } },
    create: { userId, empresaId, papel },
    update: { papel },
  });

  revalidatePath("/console/usuarios");
}

export async function removerEmpresa(userId: string, empresaId: string) {
  await verificarAdmin();

  await db.membroEmpresa.deleteMany({ where: { userId, empresaId } });
  revalidatePath("/console/usuarios");
}

export async function alternarUsuarioAtivo(id: string) {
  const sessao = await verificarAdmin();
  if (sessao.usuario.id === id) {
    throw new Error("Você não pode inativar a própria conta.");
  }
  const usuario = await db.user.findUniqueOrThrow({ where: { id }, select: { ativo: true } });
  await db.user.update({ where: { id }, data: { ativo: !usuario.ativo } });
  revalidatePath("/console/usuarios");
}

/**
 * Apaga a conta do usuário de vez (login + vínculos com empresas — Session
 * e MembroEmpresa cascateiam do `user` no schema). Não mexe nos dados das
 * empresas em si, só no acesso desta pessoa. Convites que ela mesma enviou
 * e ainda estão pendentes são apagados junto — são só links, não histórico.
 * Mesmo padrão de confirmação de `excluirEmpresa`: exige digitar um dado
 * exato da conta (aqui o e-mail, único e mais confiável que o nome) antes
 * de liberar — validado aqui, não só na UI.
 */
export async function excluirUsuario(id: string, confirmacaoEmail: string) {
  const sessao = await verificarAdmin();
  if (sessao.usuario.id === id) {
    throw new Error("Você não pode excluir a própria conta.");
  }
  const usuario = await db.user.findUniqueOrThrow({ where: { id }, select: { email: true } });
  if (confirmacaoEmail.trim() !== usuario.email) {
    throw new Error("O e-mail digitado não confere com o da conta.");
  }
  await db.convite.deleteMany({ where: { remetenteId: id } });
  await db.user.delete({ where: { id } });
  revalidatePath("/console/usuarios");
}

export async function atualizarPapel(
  userId: string,
  empresaId: string,
  papel: PapelMembro,
) {
  await verificarAdmin();

  await db.membroEmpresa.update({
    where: { empresaId_userId: { empresaId, userId } },
    data: { papel },
  });

  revalidatePath("/console/usuarios");
}

/**
 * Convida alguém pra uma empresa: cria (ou renova) um `Convite` com token e
 * devolve o link de aceite — sem infra de e-mail confiável ainda, quem
 * convida copia o link na tela e manda pra pessoa por onde for (WhatsApp,
 * e-mail pessoal etc.). Também tenta `enviarEmail` (hoje só loga, não
 * entrega de verdade — ver src/lib/email.ts) como bônus, não como único
 * canal. Nunca cria o `user` aqui — a conta só nasce quando a pessoa
 * convidada aceita e define a própria senha, em `aceitarConvite`
 * (services/convites/actions.ts).
 */
export async function convidarUsuario(dados: {
  email: string;
  empresaId: string;
  papel: PapelMembro;
}): Promise<{ link: string }> {
  const sessao = await verificarAdmin();

  const jaTemConta = await db.user.findUnique({ where: { email: dados.email } });
  if (jaTemConta) throw new Error("Já existe uma conta com este e-mail.");

  const empresa = await db.empresa.findUniqueOrThrow({ where: { id: dados.empresaId } });

  // Convite anterior pro mesmo e-mail/empresa vira obsoleto — o novo token
  // é o único válido daqui pra frente.
  await db.convite.deleteMany({
    where: { email: dados.email, empresaId: dados.empresaId, aceitoEm: null },
  });

  const expiraEm = new Date(Date.now() + VALIDADE_CONVITE_DIAS * 24 * 60 * 60 * 1000);
  const convite = await db.convite.create({
    data: {
      empresaId: dados.empresaId,
      email: dados.email,
      papel: dados.papel,
      remetenteId: sessao.usuario.id,
      expiraEm,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/aceitar-convite?token=${convite.token}`;

  await enviarEmail({
    para: dados.email,
    assunto: `Convite para ${empresa.nome} no Flow`,
    html: `
      <p>Você foi convidado pra fazer parte de <strong>${empresa.nome}</strong> no Flow, como <strong>${ROTULO_PAPEL[dados.papel]}</strong>.</p>
      <p><a href="${link}">Clique aqui para aceitar o convite</a> e criar sua conta.</p>
      <p>Este link expira em ${VALIDADE_CONVITE_DIAS} dias.</p>
    `,
  });

  revalidatePath("/console/usuarios");
  return { link };
}

/** Cancela um convite ainda não aceito — a pessoa que tentar abrir o link
 * depois disso encontra "convite inválido". */
export async function cancelarConvite(id: string) {
  await verificarAdmin();
  await db.convite.delete({ where: { id } });
  revalidatePath("/console/usuarios");
}
