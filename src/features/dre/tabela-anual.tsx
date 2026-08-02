"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { AmountText } from "@/components/shared/amount-text";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcularMargem, formatarPercentual } from "@/lib/money";
import { formatarMesCurto } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DreResultado } from "@/services/dre/dto";

/** O total do ano é a coluna que resume todas as outras — separada por uma
 * borda e um fundo levemente mais escuro para não se perder ao rolar. */
const COL_TOTAL = "border-l border-line bg-muted/30";

const TRIMESTRES = [0, 1, 2, 3] as const;

function fatiaTrimestre<T>(valores: T[], trimestre: number): T[] {
  return valores.slice(trimestre * 3, trimestre * 3 + 3);
}

/**
 * Doze meses agrupados em quatro trimestres — o que cabe numa tela de
 * celular sem rolagem é T1–T4 e o Total do ano; o mês vira detalhe que só
 * aparece quando a pessoa abre aquele trimestre especificamente, o mesmo
 * gesto que já revela categorias por trás de uma linha.
 */
export function TabelaAnualDre({ dre }: { dre: DreResultado }) {
  const [trimestresAbertos, setTrimestresAbertos] = useState([false, false, false, false]);
  const linha = (id: string) => dre.linhas.find((l) => l.id === id);

  function alternarTrimestre(t: number) {
    setTrimestresAbertos((atual) => atual.map((v, i) => (i === t ? !v : v)));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead rowSpan={2} className="sticky left-0 z-10 min-w-40 bg-surface align-bottom text-nano text-ink-muted uppercase">
              Conta
            </TableHead>
            {TRIMESTRES.map((t) => {
              const aberto = trimestresAbertos[t];
              return (
                <TableHead
                  key={t}
                  colSpan={aberto ? 3 : 1}
                  rowSpan={aberto ? 1 : 2}
                  onClick={() => alternarTrimestre(t)}
                  aria-expanded={aberto}
                  className={cn(
                    "cursor-pointer text-center text-nano text-ink-muted uppercase transition-colors",
                    aberto ? "bg-muted/40 align-top" : "align-bottom hover:bg-muted/30",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {`T${t + 1}`}
                    <ChevronDown
                      className={cn("size-3 text-ink-muted/70 transition-transform", aberto && "rotate-180")}
                      aria-hidden="true"
                    />
                  </span>
                </TableHead>
              );
            })}
            <TableHead rowSpan={2} className={cn("text-right align-bottom text-nano text-ink-muted uppercase", COL_TOTAL)}>
              Total
            </TableHead>
          </TableRow>
          <TableRow className="hover:bg-transparent">
            {TRIMESTRES.filter((t) => trimestresAbertos[t]).flatMap((t) =>
              fatiaTrimestre(dre.meses, t).map((mes, i) => (
                <TableHead key={`${t}-${i}`} className="bg-muted/40 text-right text-nano text-ink-muted uppercase">
                  {formatarMesCurto(mes)}
                </TableHead>
              )),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          <LinhaComponente linha={linha("RECEITA_BRUTA")} trimestresAbertos={trimestresAbertos} />
          <LinhaComponente linha={linha("DEDUCOES")} trimestresAbertos={trimestresAbertos} />
          <LinhaTotal rotulo="Receita líquida" valores={dre.receitaLiquida} trimestresAbertos={trimestresAbertos} />

          <LinhaComponente linha={linha("CUSTOS")} trimestresAbertos={trimestresAbertos} />
          <LinhaTotal
            rotulo="Margem de contribuição"
            valores={dre.margemContribuicao}
            trimestresAbertos={trimestresAbertos}
          />
          <LinhaPercentual
            rotulo="% sobre a receita líquida"
            numerador={dre.margemContribuicao}
            denominador={dre.receitaLiquida}
            trimestresAbertos={trimestresAbertos}
          />

          <LinhaComponente linha={linha("DESPESAS_OPERACIONAIS")} trimestresAbertos={trimestresAbertos} />
          <LinhaTotal
            rotulo="Resultado operacional"
            valores={dre.resultadoOperacional}
            trimestresAbertos={trimestresAbertos}
          />

          <LinhaComponente linha={linha("OUTRAS_RECEITAS_DESPESAS")} trimestresAbertos={trimestresAbertos} />
          <LinhaComponente linha={linha("TRIBUTOS_LUCRO")} trimestresAbertos={trimestresAbertos} />

          <LinhaTotal
            rotulo="Resultado líquido"
            valores={dre.resultadoLiquido}
            trimestresAbertos={trimestresAbertos}
            final
          />
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Uma linha de dinheiro, célula a célula: trimestre fechado vira uma soma,
 * trimestre aberto vira três meses — sempre o mesmo número de colunas que o
 * cabeçalho está mostrando naquele momento.
 */
function CelulasMoeda({
  valores,
  trimestresAbertos,
  tom,
  render,
}: {
  valores: number[];
  trimestresAbertos: boolean[];
  tom?: "neutro";
  render?: (centavos: number) => ReactNode;
}) {
  return (
    <>
      {TRIMESTRES.flatMap((t) => {
        const doTrimestre = fatiaTrimestre(valores, t);
        if (trimestresAbertos[t]) {
          return doTrimestre.map((v, i) => (
            <TableCell key={`${t}-${i}`} className="text-right">
              {render ? render(v) : <AmountText centavos={v} tom={tom} tamanho="sm" compacto />}
            </TableCell>
          ));
        }
        const soma = doTrimestre.reduce((a, b) => a + b, 0);
        return (
          <TableCell key={t} className="text-right">
            {render ? render(soma) : <AmountText centavos={soma} tom={tom} tamanho="sm" compacto />}
          </TableCell>
        );
      })}
    </>
  );
}

/** Uma linha da cascata — nasce fechada, discreta; abrir revela suas categorias. */
function LinhaComponente({
  linha,
  trimestresAbertos,
}: {
  linha: DreResultado["linhas"][number] | undefined;
  trimestresAbertos: boolean[];
}) {
  const [aberto, setAberto] = useState(false);

  if (!linha) return null;

  return (
    <Fragment>
      <TableRow
        className={cn("cursor-pointer", aberto ? "bg-muted/40" : "hover:bg-muted/30")}
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
      >
        <TableCell
          className={cn(
            "sticky left-0 z-10 text-micro text-ink-muted",
            aberto ? "bg-muted" : "bg-surface",
          )}
        >
          <span className="flex items-center gap-1.5">
            <ChevronDown
              className={cn("size-3.5 text-ink-muted/70 transition-transform", aberto && "rotate-180")}
              aria-hidden="true"
            />
            {linha.nome}
          </span>
        </TableCell>
        <CelulasMoeda valores={linha.valores} trimestresAbertos={trimestresAbertos} tom="neutro" />
        <TableCell className={cn("text-right", COL_TOTAL)}>
          <AmountText centavos={linha.totalCentavos} tom="neutro" tamanho="sm" compacto />
        </TableCell>
      </TableRow>

      {aberto &&
        linha.itens.map((item) => (
          <Fragment key={item.categoriaId}>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableCell className="sticky left-0 z-10 bg-muted pl-9 text-micro text-ink-muted">
                {item.tipo === "DESPESA" && "(-) "}
                {item.nome}
              </TableCell>
              <CelulasMoeda valores={item.valores} trimestresAbertos={trimestresAbertos} tom="neutro" />
              <TableCell className={cn("text-right", COL_TOTAL)}>
                <AmountText centavos={item.totalCentavos} tom="neutro" tamanho="sm" compacto />
              </TableCell>
            </TableRow>
            {item.subitens.map((sub) => (
              <TableRow key={sub.categoriaId} className="bg-muted/20 hover:bg-muted/20">
                <TableCell className="sticky left-0 z-10 bg-muted pl-14 text-nano text-ink-muted/80">
                  {sub.tipo === "DESPESA" && "(-) "}
                  {sub.nome}
                </TableCell>
                <CelulasMoeda valores={sub.valores} trimestresAbertos={trimestresAbertos} tom="neutro" />
                <TableCell className={cn("text-right", COL_TOTAL)}>
                  <AmountText centavos={sub.totalCentavos} tom="neutro" tamanho="sm" compacto />
                </TableCell>
              </TableRow>
            ))}
          </Fragment>
        ))}
    </Fragment>
  );
}

/** Um totalizador da cascata — sempre visível, sempre em destaque. */
function LinhaTotal({
  rotulo,
  valores,
  trimestresAbertos,
  final,
}: {
  rotulo: string;
  valores: number[];
  trimestresAbertos: boolean[];
  final?: boolean;
}) {
  const total = valores.reduce((a, b) => a + b, 0);

  return (
    <TableRow className={cn(final ? "bg-positive-wash" : "bg-canvas/60", "hover:bg-transparent")}>
      <TableCell
        className={cn(
          "sticky left-0 z-10 font-semibold text-ink",
          final ? "bg-positive-wash" : "bg-canvas",
        )}
      >
        {rotulo}
      </TableCell>
      <CelulasMoeda
        valores={valores}
        trimestresAbertos={trimestresAbertos}
        render={(v) => <AmountText centavos={v} tamanho="sm" compacto />}
      />
      <TableCell
        className={cn(
          "border-l border-line text-right",
          final ? "bg-positive-wash" : "bg-muted/30",
        )}
      >
        <AmountText centavos={total} tamanho="sm" compacto />
      </TableCell>
    </TableRow>
  );
}

/**
 * Linha de apoio em percentual — não é dinheiro, então não soma "Total" e
 * não simplesmente calcula a média dos meses: a margem de um trimestre é a
 * razão dos totais do trimestre, não a média das três margens mensais.
 */
function LinhaPercentual({
  rotulo,
  numerador,
  denominador,
  trimestresAbertos,
}: {
  rotulo: string;
  numerador: number[];
  denominador: number[];
  trimestresAbertos: boolean[];
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="sticky left-0 z-10 bg-surface pl-1 text-nano text-ink-muted">{rotulo}</TableCell>

      {TRIMESTRES.flatMap((t) => {
        const numDoTrimestre = fatiaTrimestre(numerador, t);
        const denDoTrimestre = fatiaTrimestre(denominador, t);

        if (trimestresAbertos[t]) {
          return numDoTrimestre.map((v, i) => {
            const margem = calcularMargem(v, denDoTrimestre[i]);
            return (
              <TableCell key={`${t}-${i}`} className="text-right text-nano text-ink-muted">
                {margem === null ? "—" : formatarPercentual(margem)}
              </TableCell>
            );
          });
        }

        const margem = calcularMargem(
          numDoTrimestre.reduce((a, b) => a + b, 0),
          denDoTrimestre.reduce((a, b) => a + b, 0),
        );
        return (
          <TableCell key={t} className="text-right text-nano text-ink-muted">
            {margem === null ? "—" : formatarPercentual(margem)}
          </TableCell>
        );
      })}

      <TableCell className={cn("text-right text-nano text-ink-muted", COL_TOTAL)}>—</TableCell>
    </TableRow>
  );
}
