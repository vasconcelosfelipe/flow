"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSessao } from "@/lib/sessao";
import type { FormularioCategoria } from "@/services/categorias/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  return sessao.empresaAtiva.id;
}

/**
 * Subcategoria nunca decide a própria linha da DRE, ícone ou cor — herda os
 * três da mãe, sempre. O formulário já manda isso pré-preenchido, mas
 * confiar só no cliente deixaria a regra furável; aqui é onde ela é
 * garantida de verdade.
 */
async function heredadoDaMae(empresaId: string, dados: FormularioCategoria) {
  if (!dados.categoriaPaiId) {
    return { linhaDreId: dados.linhaDreId, icone: dados.icone, cor: dados.cor };
  }
  const pai = await db.categoria.findFirst({
    where: { id: dados.categoriaPaiId, empresaId },
    select: { linhaDreId: true, icone: true, cor: true },
  });
  return {
    linhaDreId: pai?.linhaDreId ?? null,
    icone: pai?.icone ?? dados.icone,
    cor: pai?.cor ?? dados.cor,
  };
}

export async function criarCategoria(dados: FormularioCategoria) {
  const empresaId = await obterEmpresa();
  const { linhaDreId, icone, cor } = await heredadoDaMae(empresaId, dados);
  const categoria = await db.categoria.create({
    data: {
      empresaId,
      nome: dados.nome,
      icone,
      cor,
      tipo: dados.tipo,
      linhaDreId,
      categoriaPaiId: dados.categoriaPaiId,
    },
  });
  revalidatePath("/categorias");
  return categoria;
}

export async function editarCategoria(id: string, dados: FormularioCategoria) {
  const empresaId = await obterEmpresa();
  const { linhaDreId, icone, cor } = await heredadoDaMae(empresaId, dados);
  await db.categoria.update({
    where: { id, empresaId },
    data: {
      nome: dados.nome,
      icone,
      cor,
      tipo: dados.tipo,
      linhaDreId,
      categoriaPaiId: dados.categoriaPaiId,
    },
  });
  // Trocar a linha, o ícone ou a cor da mãe precisa arrastar as
  // subcategorias junto — senão elas ficam presas no valor antigo,
  // quebrando a regra de sempre herdar.
  await db.categoria.updateMany({
    where: { categoriaPaiId: id, empresaId },
    data: { linhaDreId, icone, cor },
  });
  revalidatePath("/categorias");
  revalidatePath("/dre");
}

export async function excluirCategoria(id: string) {
  const empresaId = await obterEmpresa();
  await db.categoria.update({ where: { id, empresaId }, data: { ativa: false } });
  revalidatePath("/categorias");
}
