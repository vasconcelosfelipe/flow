import type { PapelMembro } from "@/types/dominio";

/**
 * Contrato do Console — visão de quem administra a plataforma, não de quem
 * trabalha dentro de uma empresa. Fase 1 guarda em memória; Fase 2 lê e
 * grava direto nas tabelas `Empresa` e `Usuario` do Prisma, sem o filtro de
 * `empresaId` que toda consulta do app comum carrega.
 */

export type EmpresaConsole = {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  ativa: boolean;
  quantidadeUsuarios: number;
  criadaEm: Date;
};

export type FormularioEmpresaConsole = {
  id?: string;
  nome: string;
  slug: string;
  cnpj: string | null;
};

export type MembroEmpresa = {
  empresaId: string;
  empresaNome: string;
  papel: PapelMembro;
};

export type UsuarioConsole = {
  id: string;
  nome: string;
  email: string;
  adminPlataforma: boolean;
  empresas: MembroEmpresa[];
};

export type FormularioConviteUsuario = {
  nome: string;
  email: string;
  empresaId: string;
  papel: PapelMembro;
};
