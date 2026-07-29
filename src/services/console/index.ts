import type { EmpresaConsole, UsuarioConsole } from "@/services/console/dto";

/**
 * Fase 1: mock próprio do Console — deliberadamente maior que `EMPRESAS_MOCK`
 * (que só lista as empresas do usuário atual), porque quem administra a
 * plataforma vê todo mundo, não só onde tem assento.
 */
const EMPRESAS_CONSOLE_MOCK: EmpresaConsole[] = [
  {
    id: "emp_1",
    nome: "Aurora Comércio",
    slug: "aurora",
    cnpj: "12.345.678/0001-90",
    ativa: true,
    quantidadeUsuarios: 3,
    criadaEm: new Date("2025-03-12"),
  },
  {
    id: "emp_2",
    nome: "Vértice Serviços",
    slug: "vertice",
    cnpj: "98.765.432/0001-10",
    ativa: true,
    quantidadeUsuarios: 2,
    criadaEm: new Date("2025-06-01"),
  },
  {
    id: "emp_3",
    nome: "Zenith Studio",
    slug: "zenith",
    cnpj: "45.678.912/0001-33",
    ativa: false,
    quantidadeUsuarios: 1,
    criadaEm: new Date("2025-09-20"),
  },
];

const USUARIOS_CONSOLE_MOCK: UsuarioConsole[] = [
  {
    id: "usr_1",
    nome: "Felipe",
    email: "felipe@exemplo.com.br",
    adminPlataforma: true,
    empresas: [
      { empresaId: "emp_1", empresaNome: "Aurora Comércio", papel: "DONO" },
      { empresaId: "emp_2", empresaNome: "Vértice Serviços", papel: "ADMIN" },
    ],
  },
  {
    id: "usr_2",
    nome: "Camila Rocha",
    email: "camila@auroracomercio.com.br",
    adminPlataforma: false,
    empresas: [{ empresaId: "emp_1", empresaNome: "Aurora Comércio", papel: "MEMBRO" }],
  },
  {
    id: "usr_3",
    nome: "Diego Prado",
    email: "diego@vertice.com.br",
    adminPlataforma: false,
    empresas: [{ empresaId: "emp_2", empresaNome: "Vértice Serviços", papel: "LEITOR" }],
  },
];

export function listarEmpresasConsole(): EmpresaConsole[] {
  return EMPRESAS_CONSOLE_MOCK;
}

export function listarUsuariosConsole(): UsuarioConsole[] {
  return USUARIOS_CONSOLE_MOCK;
}
