import { chaveMes, formatarMesAno, formatarMesCurto } from "@/lib/dates";
import { calcularMargem, formatarMoeda, formatarPercentual, formatarValor } from "@/lib/money";
import type { DreResultado, ItemLinhaDre, ResumoDespesasPorCategoria } from "@/services/dre/dto";

/**
 * Relatório em PDF do que a tela `/dre` mostra — gerado no cliente, com os
 * mesmos dados que a página já buscou (nenhuma query nova). `jspdf` só entra
 * no bundle quando alguém de fato clica em exportar (import dinâmico abaixo).
 *
 * Fonte padrão do jsPDF (Helvetica) cobre os acentos do português, mas não
 * "—" nem "…" — por isso o texto do relatório usa só "-" e "...".
 */

export type OpcoesRelatorio = {
  espaco: string;
  modo: "mensal" | "anual";
  mes: Date;
  ano: number;
};

export type RelatorioPdf = { blob: Blob; nomeArquivo: string };

type Estilo = "componente" | "item" | "subitem" | "total" | "nota" | "final" | "vazio";
type LinhaRelatorio = { rotulo: string; celulas: string[]; estilo: Estilo; negativo?: boolean };

const COR_CABECALHO: [number, number, number] = [15, 23, 42];
const COR_TOTAL: [number, number, number] = [241, 245, 249];
const COR_POSITIVO: [number, number, number] = [220, 252, 231];
const COR_NEGATIVO: [number, number, number] = [254, 226, 226];
const COR_TEXTO_POSITIVO: [number, number, number] = [21, 128, 61];
const COR_TEXTO_NEGATIVO: [number, number, number] = [185, 28, 28];
const COR_TEXTO_SUAVE: [number, number, number] = [100, 116, 139];

function somar(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

function rotuloPeriodo(o: OpcoesRelatorio): string {
  return o.modo === "mensal" ? formatarMesAno(o.mes) : `Ano ${o.ano}`;
}

function sufixoArquivo(o: OpcoesRelatorio): string {
  return o.modo === "mensal" ? chaveMes(o.mes) : String(o.ano);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function percentual(valor: number | null): string {
  return valor === null ? "-" : formatarPercentual(valor);
}

/** Uma DRE mensal tem 1 coluna de valor (+ %); a anual tem 12 meses + total. */
function montarLinhasDre(dre: DreResultado, anual: boolean): LinhaRelatorio[] {
  const baseReceitaBruta = somar(dre.receitaBruta);
  const baseReceitaLiquida = somar(dre.receitaLiquida);

  const celulasDe = (valores: number[]): string[] => {
    if (anual) {
      return [...valores, somar(valores)].map((v) => (v === 0 ? "-" : formatarValor(v)));
    }
    const total = somar(valores);
    return [formatarMoeda(total), percentual(calcularMargem(total, baseReceitaBruta))];
  };

  const linhas: LinhaRelatorio[] = [];

  const subitem = (item: ItemLinhaDre): LinhaRelatorio => ({
    rotulo: `${item.tipo === "DESPESA" ? "(-) " : ""}${item.nome}`,
    celulas: celulasDe(item.valores),
    estilo: "subitem",
  });

  const componente = (id: string, prefixo = "") => {
    const linha = dre.linhas.find((l) => l.id === id);
    if (!linha) return;
    linhas.push({ rotulo: `${prefixo}${linha.nome}`, celulas: celulasDe(linha.valores), estilo: "componente" });
    for (const item of linha.itens) {
      linhas.push({
        rotulo: `${item.tipo === "DESPESA" ? "(-) " : ""}${item.nome}`,
        celulas: celulasDe(item.valores),
        estilo: "item",
      });
      for (const sub of item.subitens) linhas.push(subitem(sub));
    }
  };

  const total = (rotulo: string, valores: number[], estilo: Estilo = "total") =>
    linhas.push({ rotulo, celulas: celulasDe(valores), estilo });

  componente("RECEITA_BRUTA");
  componente("DEDUCOES", "(-) ");
  total("Receita líquida", dre.receitaLiquida);

  componente("CUSTOS", "(-) ");
  total("Margem de contribuição", dre.margemContribuicao);
  linhas.push({
    rotulo: "% margem s/ receita líquida",
    celulas: anual
      ? [
          ...dre.margemContribuicaoPercentual.map(percentual),
          percentual(calcularMargem(somar(dre.margemContribuicao), baseReceitaLiquida)),
        ]
      : [percentual(calcularMargem(somar(dre.margemContribuicao), baseReceitaLiquida)), ""],
    estilo: "nota",
  });

  componente("DESPESAS_OPERACIONAIS", "(-) ");
  total("Resultado operacional", dre.resultadoOperacional);

  componente("OUTRAS_RECEITAS_DESPESAS");
  componente("TRIBUTOS_LUCRO", "(-) ");
  total("Resultado líquido", dre.resultadoLiquido, "final");
  linhas[linhas.length - 1].negativo = somar(dre.resultadoLiquido) < 0;

  return linhas;
}

function montarLinhasResumo(resumo: ResumoDespesasPorCategoria): LinhaRelatorio[] {
  if (resumo.itens.length === 0) {
    return [{ rotulo: "Nenhuma despesa categorizada no período.", celulas: ["", ""], estilo: "vazio" }];
  }
  return [
    ...resumo.itens.map(
      (item): LinhaRelatorio => ({
        rotulo: item.nome,
        celulas: [formatarMoeda(item.totalCentavos), formatarPercentual(Math.round(item.percentual * 10_000))],
        estilo: "item",
      }),
    ),
    { rotulo: "Total de despesas", celulas: [formatarMoeda(resumo.totalCentavos), "100,00%"], estilo: "total" },
  ];
}

async function gerarPdf(params: {
  titulo: string;
  opcoes: OpcoesRelatorio;
  cabecalho: string[];
  linhas: LinhaRelatorio[];
  paisagem: boolean;
  prefixoArquivo: string;
  /** Larguras fixas só onde precisa — o resto divide o que sobra. */
  larguraRotulo: number;
}): Promise<RelatorioPdf> {
  const { titulo, opcoes, cabecalho, linhas, paisagem, prefixoArquivo, larguraRotulo } = params;
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ orientation: paisagem ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const margem = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(opcoes.espaco, margem, 16);

  doc.setFontSize(12);
  doc.text(`${titulo} - ${rotuloPeriodo(opcoes)}`, margem, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COR_TEXTO_SUAVE);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margem, 28);

  const estilos = linhas.map((l) => l.estilo);
  const negativos = linhas.map((l) => l.negativo === true);

  autoTable(doc, {
    startY: 32,
    margin: { left: margem, right: margem, bottom: 14 },
    head: [cabecalho],
    body: linhas.map((l) => [l.rotulo, ...l.celulas]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: paisagem ? 7 : 9, cellPadding: paisagem ? 1.4 : 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: COR_CABECALHO, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: larguraRotulo },
      ...Object.fromEntries(cabecalho.slice(1).map((_, i) => [i + 1, { halign: "right" as const }])),
    },
    didParseCell: (data) => {
      if (data.section === "head") {
        if (data.column.index > 0) data.cell.styles.halign = "right";
        return;
      }
      if (data.section !== "body") return;
      const estilo = estilos[data.row.index];

      if (estilo === "componente") {
        data.cell.styles.fontStyle = "bold";
      } else if (estilo === "item") {
        data.cell.styles.textColor = [71, 85, 105];
        if (data.column.index === 0) data.cell.styles.cellPadding = { left: 6, top: 1.4, bottom: 1.4, right: 1.4 };
      } else if (estilo === "subitem") {
        data.cell.styles.textColor = COR_TEXTO_SUAVE;
        if (data.column.index === 0) data.cell.styles.cellPadding = { left: 11, top: 1.2, bottom: 1.2, right: 1.4 };
      } else if (estilo === "total") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = COR_TOTAL;
      } else if (estilo === "nota") {
        data.cell.styles.fontStyle = "italic";
        data.cell.styles.textColor = COR_TEXTO_SUAVE;
      } else if (estilo === "final") {
        data.cell.styles.fontStyle = "bold";
        const negativo = negativos[data.row.index];
        data.cell.styles.fillColor = negativo ? COR_NEGATIVO : COR_POSITIVO;
        data.cell.styles.textColor = negativo ? COR_TEXTO_NEGATIVO : COR_TEXTO_POSITIVO;
      } else if (estilo === "vazio") {
        data.cell.styles.textColor = COR_TEXTO_SUAVE;
      }
    },
  });

  const paginas = doc.getNumberOfPages();
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COR_TEXTO_SUAVE);
    doc.text(`Flow - página ${i} de ${paginas}`, largura / 2, altura - 7, { align: "center" });
  }

  return { blob: doc.output("blob"), nomeArquivo: `${prefixoArquivo}-${sufixoArquivo(opcoes)}.pdf` };
}

export async function gerarPdfDre(dre: DreResultado, opcoes: OpcoesRelatorio): Promise<RelatorioPdf> {
  const anual = opcoes.modo === "anual";
  const cabecalho = anual
    ? ["Descrição", ...dre.meses.map((m) => capitalizar(formatarMesCurto(m))), "Total"]
    : ["Descrição", "Valor", "% s/ receita bruta"];

  return gerarPdf({
    titulo: "DRE",
    opcoes,
    cabecalho,
    linhas: montarLinhasDre(dre, anual),
    paisagem: anual,
    prefixoArquivo: "dre",
    larguraRotulo: anual ? 50 : 100,
  });
}

export async function gerarPdfResumoDespesas(
  resumo: ResumoDespesasPorCategoria,
  opcoes: OpcoesRelatorio,
): Promise<RelatorioPdf> {
  return gerarPdf({
    titulo: "Resumo de despesas por categoria",
    opcoes,
    cabecalho: ["Categoria", "Total", "% do total"],
    linhas: montarLinhasResumo(resumo),
    paisagem: false,
    prefixoArquivo: "resumo",
    larguraRotulo: 100,
  });
}
