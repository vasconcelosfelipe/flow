"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSessao } from "@/lib/sessao";
import type { FormularioCategoria } from "@/services/categorias/dto";
import type { ChaveSecaoDre } from "@/services/dre/dto";

async function obterEmpresa() {
  const sessao = await requireSessao();
  if (!sessao.empresaAtiva) throw new Error("Sem empresa ativa");
  return sessao.empresaAtiva.id;
}

export async function criarCategoria(dados: FormularioCategoria) {
  const empresaId = await obterEmpresa();
  await db.categoria.create({
    data: {
      empresaId,
      nome: dados.nome,
      icone: dados.icone,
      cor: dados.cor,
      tipo: dados.tipo,
      secaoDre: dados.linhaDreId as ChaveSecaoDre | null,
    },
  });
  revalidatePath("/categorias");
}

export async function editarCategoria(id: string, dados: FormularioCategoria) {
  const empresaId = await obterEmpresa();
  await db.categoria.update({
    where: { id, empresaId },
    data: {
      nome: dados.nome,
      icone: dados.icone,
      cor: dados.cor,
      tipo: dados.tipo,
      secaoDre: dados.linhaDreId as ChaveSecaoDre | null,
    },
  });
  revalidatePath("/categorias");
}

export async function excluirCategoria(id: string) {
  const empresaId = await obterEmpresa();
  await db.categoria.update({ where: { id, empresaId }, data: { ativa: false } });
  revalidatePath("/categorias");
}
