import type { TipoMovimentacao } from "@/types/dominio";

/**
 * Uma das seis linhas fixas da DRE gerencial — cadastro de referência
 * (`linhas_dre`), não uma lista hardcoded no código. A tela de Categorias
 * consulta isto para oferecer as opções do seletor "Linha da DRE"; o
 * serviço de DRE consulta a mesma tabela para montar a estrutura do
 * relatório e descobrir, via `Categoria.linhaDreId`, quais categorias
 * pertencem a cada linha.
 */
export type LinhaDreOpcao = {
  id: string;
  nome: string;
  ordem: number;
  /** `null` = aceita categoria de receita e de despesa. */
  tipoPermitido: TipoMovimentacao | null;
};
