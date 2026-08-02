import { isSameMonth } from "date-fns";

import { db } from "@/lib/db";
import { calcularMargem } from "@/lib/money";
import type { Centavos } from "@/lib/money";
import type { DreResultado, ItemLinhaDre, LinhaDreResultado } from "@/services/dre/dto";
import { listarLinhasDre } from "@/services/linhas-dre";

function somaZerada(quantidade: number): Centavos[] {
  return Array.from({ length: quantidade }, () => 0);
}

/**
 * Monta a DRE inteiramente a partir de Movimentações → Categorias → Linha
 * da DRE. Nenhuma lista de categorias fica hardcoded aqui: a única fonte de
 * verdade sobre "quais categorias somam nesta linha" é `Categoria.linhaDreId`,
 * configurado na tela de Categorias — este serviço só consulta.
 */
export async function montarDre(empresaId: string, meses: Date[]): Promise<DreResultado> {
  const tamanho = meses.length;

  const [movimentacoes, linhasDre, subcategorias] = await Promise.all([
    db.movimentacao.findMany({
      where: { empresaId, status: { in: ["PAGO", "CONCILIADO"] }, data: { not: null } },
      select: {
        valorCentavos: true,
        tipo: true,
        data: true,
        categoria: { select: { id: true, nome: true, linhaDreId: true, categoriaPaiId: true } },
      },
    }),
    listarLinhasDre(),
    // Toda categoria com mãe, mesmo sem nenhuma movimentação no período —
    // é o que permite sintetizar a linha da mãe com total zero quando só a
    // subcategoria teve lançamento, pra ela nunca aparecer solta.
    db.categoria.findMany({
      where: { empresaId, categoriaPaiId: { not: null }, ativa: true },
      select: {
        id: true,
        categoriaPai: { select: { id: true, nome: true, tipo: true } },
      },
    }),
  ]);

  const paiPorCategoriaId = new Map(
    subcategorias
      .filter((c) => c.categoriaPai)
      .map((c) => [c.id, c.categoriaPai!]),
  );

  // Agrupa por linha da DRE e, dentro dela, por categoria real — nunca uma
  // linha fictícia repetindo o nome da seção.
  const itensPorLinha = new Map<string, Map<string, ItemLinhaDre>>();

  for (const mov of movimentacoes) {
    const categoria = mov.categoria;
    if (!categoria?.linhaDreId || !mov.data) continue; // sem linha vinculada: fora da DRE

    const mesIndex = meses.findIndex((m) => isSameMonth(m, mov.data!));
    if (mesIndex === -1) continue;

    let itensDaLinha = itensPorLinha.get(categoria.linhaDreId);
    if (!itensDaLinha) {
      itensDaLinha = new Map();
      itensPorLinha.set(categoria.linhaDreId, itensDaLinha);
    }

    let item = itensDaLinha.get(categoria.id);
    if (!item) {
      item = {
        categoriaId: categoria.id,
        nome: categoria.nome,
        tipo: mov.tipo as ItemLinhaDre["tipo"],
        valores: somaZerada(tamanho),
        totalCentavos: 0,
        subitens: [],
      };
      itensDaLinha.set(categoria.id, item);
    }

    item.valores[mesIndex] += mov.valorCentavos;
    item.totalCentavos += mov.valorCentavos;
  }

  const linhas: LinhaDreResultado[] = linhasDre
    .map((linha): LinhaDreResultado => {
      const todosOsItens = [...(itensPorLinha.get(linha.id)?.values() ?? [])];

      // Linhas de tipo único (Receita Bruta, Deduções, Custos, Despesas
      // Operacionais, Tributos) somam a magnitude direta — quem subtrai é a
      // cascata abaixo. Só a linha mista (tipoPermitido nulo — Outras
      // Receitas/Despesas) precisa netar receita e despesa aqui dentro,
      // porque a cascata só faz `+ outrasReceitasDespesas`, uma vez.
      const mista = linha.tipoPermitido === null;
      const valores = todosOsItens.reduce((soma, item) => {
        const sinal = mista && item.tipo === "DESPESA" ? -1 : 1;
        return soma.map((v, i) => v + sinal * item.valores[i]);
      }, somaZerada(tamanho));

      // Aninha: subcategoria vira `subitens` da categoria mãe em vez de item
      // solto — a soma acima já rodou sobre a lista flat, então o total da
      // linha não muda, só a forma como os itens aparecem organizados. Se a
      // mãe não teve lançamento próprio no período, sintetiza uma entrada
      // dela com total zero só pra subcategoria ter onde aninhar.
      const porId = new Map(todosOsItens.map((item) => [item.categoriaId, item]));
      const itens: ItemLinhaDre[] = [];

      for (const item of todosOsItens) {
        const pai = paiPorCategoriaId.get(item.categoriaId);
        if (!pai) {
          itens.push(item);
          continue;
        }
        let itemPai = porId.get(pai.id);
        if (!itemPai) {
          itemPai = {
            categoriaId: pai.id,
            nome: pai.nome,
            tipo: pai.tipo,
            valores: somaZerada(tamanho),
            totalCentavos: 0,
            subitens: [],
          };
          porId.set(pai.id, itemPai);
          itens.push(itemPai);
        }
        itemPai.subitens.push(item);
      }

      return {
        id: linha.id,
        nome: linha.nome,
        ordem: linha.ordem,
        itens,
        valores,
        totalCentavos: valores.reduce((a, b) => a + b, 0),
      };
    })
    .filter((l) => l.itens.length > 0);

  const buscar = (id: string) => linhas.find((l) => l.id === id)?.valores ?? somaZerada(tamanho);

  const receitaBruta = buscar("RECEITA_BRUTA");
  const deducoes = buscar("DEDUCOES");
  const custos = buscar("CUSTOS");
  const despesasOperacionais = buscar("DESPESAS_OPERACIONAIS");
  const outrasReceitasDespesas = buscar("OUTRAS_RECEITAS_DESPESAS");
  const tributosSobreLucro = buscar("TRIBUTOS_LUCRO");

  const receitaLiquida = receitaBruta.map((v, i) => v - deducoes[i]);
  const margemContribuicao = receitaLiquida.map((v, i) => v - custos[i]);
  const resultadoOperacional = margemContribuicao.map((v, i) => v - despesasOperacionais[i]);
  const resultadoLiquido = resultadoOperacional.map(
    (v, i) => v + outrasReceitasDespesas[i] - tributosSobreLucro[i],
  );

  const margemContribuicaoPercentual = margemContribuicao.map((v, i) =>
    calcularMargem(v, receitaLiquida[i]),
  );
  const margem = resultadoLiquido.map((v, i) => calcularMargem(v, receitaLiquida[i]));

  return {
    meses,
    linhas,
    receitaBruta,
    deducoes,
    receitaLiquida,
    custos,
    margemContribuicao,
    margemContribuicaoPercentual,
    despesasOperacionais,
    resultadoOperacional,
    outrasReceitasDespesas,
    tributosSobreLucro,
    resultadoLiquido,
    margem,
  };
}
