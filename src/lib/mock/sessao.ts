import type { EmpresaResumo, SessaoAtual } from "@/services/empresas/dto";

/**
 * Dados fictícios da Fase 1.
 *
 * Existem para validar layout e fluxo antes de qualquer banco. Implementam os
 * mesmos tipos que os services vão devolver na Fase 2, então trocar a origem
 * não toca em nenhum componente.
 */

export const EMPRESAS_MOCK: EmpresaResumo[] = [
  {
    id: "emp_1",
    nome: "Aurora Comércio",
    slug: "aurora",
    cnpj: "12.345.678/0001-90",
    papel: "DONO",
  },
  {
    id: "emp_2",
    nome: "Vértice Serviços",
    slug: "vertice",
    cnpj: "98.765.432/0001-10",
    papel: "ADMIN",
  },
];

export const SESSAO_MOCK: SessaoAtual = {
  usuario: {
    id: "usr_1",
    nome: "Felipe",
    email: "felipe@exemplo.com.br",
    adminPlataforma: true,
  },
  empresaAtiva: EMPRESAS_MOCK[0],
  empresas: EMPRESAS_MOCK,
};
