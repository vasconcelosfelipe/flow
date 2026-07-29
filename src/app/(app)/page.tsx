import { Container } from "@/components/layout/container";
import { PeriodPicker } from "@/components/shared/period-picker";
import { CartaoResultado } from "@/features/dashboard/cartao-resultado";
import { CartaoSaldo } from "@/features/dashboard/cartao-saldo";
import { CartoesPendencias } from "@/features/dashboard/cartoes-pendencias";
import { ListaAlertas } from "@/features/dashboard/lista-alertas";
import { ResumoPeriodo } from "@/features/dashboard/resumo-periodo";
import { UltimasMovimentacoes } from "@/features/dashboard/ultimas-movimentacoes";
import { formatarMesAno, resolverPeriodoDeParams } from "@/lib/dates";
import { requireSessao } from "@/lib/sessao";
import { obterResumoDashboard } from "@/services/dashboard";

type Props = {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
};

/**
 * Raio e sobreposição das quatro emendas azul/branco, sempre no mesmo par.
 *
 * As duas medidas precisam bater: com a sobreposição menor que o raio, o arco
 * nunca fecha por completo e a curva sai torta. Iguais, o arco fecha inteiro —
 * é o mesmo efeito de "folha puxada por cima" que apps premium usam nas
 * transições de fundo.
 *
 * `relative z-{n}` crescente em cada emenda não é estético — é o que garante
 * que cada seção pinte por cima da anterior na faixa de sobreposição. Sem um
 * z-index explícito, o CSS pinta elemento `position: relative` sempre depois
 * de um `static`, não importa a ordem no HTML: numa emenda em que o arco
 * pertence ao lado que veio antes, isso funciona por acaso; na emenda em que
 * o arco pertence ao lado que vem depois, o elemento de cima cobre a curva
 * inteira e ela some — foi exatamente o que aconteceu acima de "Últimas
 * movimentações".
 */
const RAIO_EMENDA = "rounded-t-[2rem]";
/** Última emenda: quem possui a curva se inverte — o escuro desce sobre o claro. */
const RAIO_EMENDA_INFERIOR = "rounded-b-[2rem]";
const SOBREPOSICAO_EMENDA = "-mt-8";

/**
 * `z-index` de cada seção, nomeado pelo valor — não pela posição no DOM.
 *
 * Na última emenda quem possui a curva se inverte (o escuro desce sobre o
 * claro em vez do claro subir sobre o escuro), então a terceira seção da
 * página precisa do `z-index` mais alto de todos, não do terceiro mais alto.
 * Nomear por posição ("camada 3", "camada 4") seria enganoso justamente onde
 * mais importa acertar — por isso os nomes são o próprio valor.
 *
 * As classes ficam escritas por extenso, uma a uma. O Tailwind decide quais
 * regras CSS gerar lendo o código-fonte como texto — ele não executa
 * `` `z-${n * 10}` ``, então essa forma nunca produziria a string "z-20" em
 * lugar nenhum do arquivo, e a classe existiria na tag sem existir no CSS.
 */
const Z10 = "relative z-10";
const Z20 = "relative z-20";
const Z30 = "relative z-30";
const Z40 = "relative z-40";

/** Curva + sobreposição — só as seções 2, 3 e 4 emendam na anterior. */
const EMENDA = `${SOBREPOSICAO_EMENDA} ${RAIO_EMENDA}`;

/**
 * Ordem da tela = ordem das perguntas de quem abre o app:
 * quanto tenho → o que devo e me devem → como o período está fechando →
 * a composição disso → o que aconteceu por último → o que precisa de ação.
 *
 * O fundo alterna escuro/claro três vezes: escuro no topo (saudação, período,
 * saldo), claro numa faixa de cards (a pagar/receber, resultado, resumo),
 * escuro de novo atrás de "Últimas movimentações", e claro outra vez antes de
 * "Precisa de atenção". Só a primeira zona escura carrega o brilho da marca
 * (`textura-noite`) — a segunda usa só a malha (`textura-noite-eco`), porque
 * duas zonas com brilho próprio competem como dois heróis em vez de lerem
 * como a mesma atmosfera voltando à tona.
 */
export default async function InicioPage({ searchParams }: Props) {
  const params = await searchParams;
  const periodo = resolverPeriodoDeParams(params);
  const { usuario, empresaAtiva } = await requireSessao();
  const resumo = await obterResumoDashboard(empresaAtiva.id, periodo);

  const rotuloPeriodo =
    params.de || params.ate || (params.periodo && params.periodo !== "mes")
      ? "Resultado do período"
      : "Resultado do mês";

  return (
    <>
      {/* Escuro — saudação, período e saldo, nu sobre a marca. */}
      <section className={`textura-noite bg-night pb-12 text-night-text ${Z10}`}>
        <Container className="space-y-5 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-micro text-night-muted">Olá, {usuario.nome} 👋</p>
              <h1 className="mt-0.5 text-titulo font-semibold tracking-tight">
                {formatarMesAno(periodo.de)}
              </h1>
            </div>
          </div>

          <PeriodPicker tema="escuro" />

          <CartaoSaldo
            centavos={resumo.saldoTotalCentavos}
            quantidadeContas={resumo.quantidadeContas}
          />
        </Container>
      </section>

      {/* Claro — cards, movimentações e alertas. */}
      <div className={`${Z20} ${EMENDA} bg-canvas`}>
        <Container className="space-y-4 pt-7 pb-6">
          <CartoesPendencias aPagar={resumo.aPagar} aReceber={resumo.aReceber} />

          <CartaoResultado
            rotulo={rotuloPeriodo}
            receitas={resumo.receitasCentavos}
            despesas={resumo.despesasCentavos}
            acumulado={resumo.serieAcumulada}
          />

          <ResumoPeriodo
            rotulo={rotuloPeriodo === "Resultado do mês" ? "Resumo do mês" : "Resumo do período"}
            receitas={resumo.receitasCentavos}
            despesas={resumo.despesasCentavos}
          />

          <UltimasMovimentacoes movimentacoes={resumo.ultimasMovimentacoes} />

          <ListaAlertas alertas={resumo.alertas} />
        </Container>
      </div>
    </>
  );
}
