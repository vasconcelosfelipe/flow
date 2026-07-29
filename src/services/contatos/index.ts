import { CONTATOS_MOCK, MOVIMENTACOES_MOCK } from "@/lib/mock/dados";
import type { ContatoCompleto } from "@/services/contatos/dto";

function contarUso(contatoId: string): number {
  return MOVIMENTACOES_MOCK.filter((m) => m.contato?.id === contatoId).length;
}

export function listarContatos(): ContatoCompleto[] {
  return CONTATOS_MOCK.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    documento: c.documento,
    quantidadeMovimentacoes: contarUso(c.id),
  }));
}
