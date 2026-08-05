import type { SessaoAtual } from "@/services/empresas/dto";
import type { PapelMembro } from "@/types/dominio";

/** LEITOR só enxerga dados — todo o resto (DONO/ADMIN/MEMBRO) pode escrever. */
export function podeEscrever(papel: PapelMembro) {
  return papel !== "LEITOR";
}

/** Lançado dentro de Server Actions de mutação — pego pelos mesmos
 * `try/catch` que os formulários já usam pra exibir erro de servidor. */
export function requireEscrita(sessao: SessaoAtual) {
  if (!podeEscrever(sessao.empresaAtiva.papel)) {
    throw new Error("Você não tem permissão para realizar esta ação.");
  }
}
