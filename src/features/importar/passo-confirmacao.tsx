"use client";

import Link from "next/link";
import { CircleCheck, EyeOff, GitMerge, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ResultadoConfirmacao } from "@/services/importacao/dto";

/**
 * Terceiro passo: confirma o que foi feito e aponta para onde ir em seguida.
 * Sem isso a pessoa sai da importação sem saber se deve conferir algo agora
 * ou se o trabalho terminou aqui.
 */
export function PassoConfirmacao({
  resultado,
  contaNome,
  aoImportarOutro,
}: {
  resultado: ResultadoConfirmacao;
  contaNome: string;
  aoImportarOutro: () => void;
}) {
  const total = resultado.criadas + resultado.conciliadas;

  return (
    <div className="flex flex-col items-center pt-8 pb-24 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-positive-wash text-positive-text">
        <CircleCheck className="size-9" aria-hidden="true" />
      </span>

      <h2 className="mt-5 text-titulo font-semibold text-ink">Importação concluída</h2>
      <p className="mt-1 max-w-xs text-corpo text-ink-muted">
        {total} {total === 1 ? "lançamento entrou" : "lançamentos entraram"} em{" "}
        <strong className="text-ink">{contaNome}</strong>.
      </p>

      <div className="mt-6 w-full max-w-xs space-y-2 rounded-2xl border border-line bg-surface p-4 text-left shadow-card">
        {resultado.criadas > 0 && (
          <div className="flex items-center gap-2 text-micro">
            <Plus className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span className="text-ink">
              {resultado.criadas} {resultado.criadas === 1 ? "lançamento novo" : "lançamentos novos"}
            </span>
          </div>
        )}
        {resultado.conciliadas > 0 && (
          <div className="flex items-center gap-2 text-micro">
            <GitMerge className="size-3.5 shrink-0 text-positive-text" aria-hidden="true" />
            <span className="text-ink">
              {resultado.conciliadas}{" "}
              {resultado.conciliadas === 1 ? "pendência fechada" : "pendências fechadas"}
            </span>
          </div>
        )}
        {resultado.ignoradas > 0 && (
          <div className="flex items-center gap-2 text-micro">
            <EyeOff className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="text-ink">
              {resultado.ignoradas}{" "}
              {resultado.ignoradas === 1 ? "lançamento ignorado" : "lançamentos ignorados"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/movimentacoes">Ver movimentações</Link>
        </Button>
        <Button variant="outline" className="w-full" onClick={aoImportarOutro}>
          Importar outro arquivo
        </Button>
      </div>
    </div>
  );
}
