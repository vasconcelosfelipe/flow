import type { PapelMembro, TipoEmpresa } from "@/types/dominio";

export type EmpresaResumo = {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  tipo: TipoEmpresa;
  /** Papel do usuário atual nesta empresa. Define o que a interface oferece. */
  papel: PapelMembro;
};

/**
 * Contexto resolvido a cada requisição.
 *
 * Na Fase 2 isto vem de `requireEmpresa()`; no protótipo vem do mock. Todo
 * componente que precisa saber "quem sou e em qual empresa estou" lê daqui, e
 * nunca de um estado global no cliente.
 */
export type SessaoAtual = {
  usuario: {
    id: string;
    nome: string;
    email: string;
    adminPlataforma: boolean;
  };
  empresaAtiva: EmpresaResumo;
  empresas: EmpresaResumo[];
};
