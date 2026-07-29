import { AmountText } from "@/components/shared/amount-text";
import type { Centavos } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * O bloco "Resumo do mês" da referência: receitas e despesas como barras de
 * progresso proporcionais ao total movimentado, e o resultado fechando embaixo.
 *
 * É a versão em régua do card de resultado — mesmo dado, outra forma de ler.
 * A barra maior é visualmente a resposta de "para onde foi o dinheiro".
 */
export function ResumoPeriodo({
  rotulo,
  receitas,
  despesas,
}: {
  rotulo: string;
  receitas: Centavos;
  despesas: Centavos;
}) {
  const total = receitas + despesas;
  const resultado = receitas - despesas;
  const pctReceitas = total === 0 ? 0 : Math.round((receitas / total) * 100);
  const pctDespesas = total === 0 ? 0 : 100 - pctReceitas;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-nano font-semibold tracking-[0.14em] text-ink-muted uppercase">
        {rotulo}
      </h2>

      <dl className="mt-4 space-y-4">
        <Linha
          rotulo="Receitas"
          valor={receitas}
          percentual={pctReceitas}
          cor="bg-positive"
          texto="text-positive-text"
        />
        <Linha
          rotulo="Despesas"
          valor={despesas}
          percentual={pctDespesas}
          cor="bg-negative"
          texto="text-negative-text"
        />
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-micro font-medium text-ink">Resultado</span>
        <AmountText centavos={resultado} tamanho="lg" comSinal />
      </div>
    </section>
  );
}

function Linha({
  rotulo,
  valor,
  percentual,
  cor,
  texto,
}: {
  rotulo: string;
  valor: Centavos;
  percentual: number;
  cor: string;
  texto: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-micro text-ink-muted">{rotulo}</dt>
        <dd className="flex items-baseline gap-2">
          <AmountText centavos={valor} tom="neutro" tamanho="sm" />
          <span className={cn("w-8 text-right text-nano font-semibold", texto)}>
            {percentual}%
          </span>
        </dd>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${rotulo} representam ${percentual}% do total movimentado`}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", cor)}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}
