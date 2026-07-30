import { db } from "@/lib/db";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";

/**
 * As seis linhas fixas da DRE, na ordem da cascata. Cadastro de referência
 * global — não varia por empresa.
 */
export async function listarLinhasDre(): Promise<LinhaDreOpcao[]> {
  const linhas = await db.linhaDre.findMany({ orderBy: { ordem: "asc" } });
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    ordem: l.ordem,
    tipoPermitido: l.tipoPermitido,
  }));
}
