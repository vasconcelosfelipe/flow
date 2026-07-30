import { isSameMonth } from "date-fns";

import { db } from "@/lib/db";
import { calcularMargem } from "@/lib/money";
import type { ChaveSecaoDre, DreResultado, LinhaDre, SecaoDre } from "@/services/dre/dto";
import { ORDEM_SECOES, ROTULO_SECAO } from "@/services/dre/definicoes";
import type { DefinicaoLinhaDre } from "@/services/dre/definicoes";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type { TipoGrupoDre } from "@/types/dominio";

const CONCILIADO = ["CONCILIADO", "PAGO"] as const;

function realizadas(movs: MovimentacaoResumo[]) {
  return movs.filter(
    (m) => m.data !== null && CONCILIADO.includes(m.status as (typeof CONCILIADO)[number]),
  );
}

function somaZerada(quantidade: number): number[] {
  return Array.from({ length: quantidade }, () => 0);
}

function somarPorMes(movs: MovimentacaoResumo[], categorias: string[], meses: Date[]): number[] {
  if (categorias.length === 0) return somaZerada(meses.length);

  return meses.map((mes) =>
    movs
      .filter((m) => m.categoria !== null && categorias.includes(m.categoria.id) && m.data && isSameMonth(m.data, mes))
      .reduce((soma, m) => soma + m.valorCentavos, 0),
  );
}

export async function montarDre(empresaId: string, meses: Date[]): Promise<DreResultado> {
  const [rows, cats] = await Promise.all([
    db.movimentacao.findMany({
      where: { empresaId, status: { in: ["PAGO", "CONCILIADO"] }, data: { not: null } },
      include: { categoria: true, conta: true, contato: true },
    }),
    db.categoria.findMany({
      where: { empresaId, ativa: true, secaoDre: { not: null } },
    }),
  ]);

  const rawMovs: MovimentacaoResumo[] = rows.map((m) => ({
    id: m.id,
    descricao: m.descricao,
    valorCentavos: m.valorCentavos,
    tipo: m.tipo as "RECEITA" | "DESPESA",
    status: m.status as MovimentacaoResumo["status"],
    data: m.data,
    dataVencimento: m.dataVencimento,
    numeroParcela: m.numeroParcela,
    totalParcelas: m.totalParcelas,
    recorrente: m.recorrente,
    categoria: m.categoria
      ? { id: m.categoria.id, nome: m.categoria.nome, icone: m.categoria.icone, cor: m.categoria.cor }
      : null,
    conta: { id: m.conta.id, nome: m.conta.nome, cor: m.conta.cor, tipo: m.conta.tipo as MovimentacaoResumo["conta"]["tipo"] },
    contato: m.contato ? { id: m.contato.id, nome: m.contato.nome } : null,
  }));

  // Build dynamic lines from real categories grouped by secaoDre
  const catsPorSecao = new Map<ChaveSecaoDre, typeof cats>();
  for (const cat of cats) {
    if (!cat.secaoDre) continue;
    const secao = cat.secaoDre as ChaveSecaoDre;
    const grupo = catsPorSecao.get(secao) ?? [];
    grupo.push(cat);
    catsPorSecao.set(secao, grupo);
  }

  const dinamicas: DefinicaoLinhaDre[] = [];
  for (const [secao, grupo] of catsPorSecao.entries()) {
    for (const cat of grupo) {
      const grupo_tipo: TipoGrupoDre =
        cat.tipo === "RECEITA"
          ? secao === "RECEITA_BRUTA" ? "RECEITA" : "RECEITA_FINANCEIRA"
          : secao === "DEDUCOES" ? "DEDUCAO"
          : secao === "CUSTOS" ? "CUSTO"
          : secao === "TRIBUTOS_LUCRO" ? "TRIBUTOS_LUCRO"
          : secao === "RESULTADO_NAO_OPERACIONAL" ? "DESPESA_FINANCEIRA"
          : "DESPESA";

      const linhaExistente = dinamicas.find((d) => d.id === `secao-${secao}-${cat.tipo}`);
      if (linhaExistente) {
        linhaExistente.categorias.push(cat.id);
      } else {
        dinamicas.push({
          id: `secao-${secao}-${cat.tipo}`,
          nome: cat.tipo === "RECEITA" ? ROTULO_SECAO[secao] : ROTULO_SECAO[secao],
          grupo: grupo_tipo,
          secao,
          sinal: cat.tipo === "RECEITA" ? 1 : 1,
          categorias: [cat.id],
        });
      }
    }
  }

  const movs = realizadas(rawMovs);
  const tamanho = meses.length;

  const secoes: SecaoDre[] = ORDEM_SECOES.map((chave) => {
    const linhas: LinhaDre[] = dinamicas.filter((def) => def.secao === chave).map((def) => {
      const valores = somarPorMes(movs, def.categorias, meses);
      return {
        id: def.id,
        nome: def.nome,
        sinal: def.sinal,
        valores,
        totalCentavos: valores.reduce((a, b) => a + b, 0),
      };
    });

    // O sinal aplica-se aqui: uma despesa não operacional soma tamanho ao
    // total exibido, mas subtrai do valor da seção.
    const valores = linhas.reduce(
      (total, linha) => total.map((v, i) => v + linha.sinal * linha.valores[i]),
      somaZerada(tamanho),
    );

    return {
      chave,
      rotulo: ROTULO_SECAO[chave],
      linhas,
      valores,
      totalCentavos: valores.reduce((a, b) => a + b, 0),
    };
  }).filter((s) => s.linhas.length > 0);

  const porSecao = (chave: ChaveSecaoDre) => secoes.find((s) => s.chave === chave)?.valores ?? somaZerada(tamanho);

  const receitaBruta = porSecao("RECEITA_BRUTA");
  const deducoes = porSecao("DEDUCOES");
  const custos = porSecao("CUSTOS");
  const despesasOperacionais = porSecao("DESPESAS_OPERACIONAIS");
  const resultadoNaoOperacional = porSecao("RESULTADO_NAO_OPERACIONAL");
  const tributosSobreLucro = porSecao("TRIBUTOS_LUCRO");

  const receitaLiquida = receitaBruta.map((v, i) => v - deducoes[i]);
  const margemContribuicao = receitaLiquida.map((v, i) => calcularMargem(v, receitaBruta[i]));
  const lucroBruto = receitaLiquida.map((v, i) => v - custos[i] - despesasOperacionais[i]);
  const lucroAntesTributos = lucroBruto.map((v, i) => v + resultadoNaoOperacional[i]);
  const lucroLiquido = lucroAntesTributos.map((v, i) => v - tributosSobreLucro[i]);
  const margem = lucroLiquido.map((v, i) => calcularMargem(v, receitaLiquida[i]));

  return {
    meses,
    secoes,
    receitaBruta,
    deducoes,
    receitaLiquida,
    margemContribuicao,
    custos,
    despesasOperacionais,
    lucroBruto,
    resultadoNaoOperacional,
    lucroAntesTributos,
    tributosSobreLucro,
    lucroLiquido,
    margem,
  };
}

