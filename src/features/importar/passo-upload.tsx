"use client";

import { useRef, useState } from "react";
import { FileUp, Sparkles, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { processarArquivoOfx } from "@/services/importacao/actions";
import type { ResumoImportacao } from "@/services/importacao/dto";

type OpcaoConta = { id: string; nome: string };

/**
 * Decodifica como texto tentando UTF-8 primeiro; cai para Windows-1252 se a
 * decodificação falhar. Bancos brasileiros declaram `CHARSET:1252` no
 * cabeçalho do OFX mas nem sempre é verdade — vários exportam em UTF-8 de
 * qualquer jeito. `fatal: true` faz o UTF-8 falhar de propósito diante de
 * uma sequência de bytes inválida, em vez de silenciosamente virar lixo.
 */
async function lerArquivoTexto(arquivo: File): Promise<string> {
  const buffer = await arquivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/**
 * Primeiro passo: escolher para qual conta o extrato pertence, e o arquivo.
 *
 * A conta vem antes do arquivo porque sem ela não há como decidir contra qual
 * saldo os lançamentos conciliam — pedir isso depois do upload obrigaria a
 * pessoa a repetir o passo.
 */
export function PassoUpload({
  contas,
  aoProcessar,
}: {
  contas: OpcaoConta[];
  aoProcessar: (resumo: ResumoImportacao) => void;
}) {
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [arrastando, setArrastando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function receberArquivo(arquivo: File | undefined) {
    if (!arquivo || !contaId) return;
    setErro(null);
    setProcessando(true);
    try {
      const conteudo = await lerArquivoTexto(arquivo);
      const resumo = await processarArquivoOfx(conteudo, arquivo.name, contaId);
      aoProcessar(resumo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ler este arquivo.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-micro font-medium text-ink-muted">Conta do extrato</label>
        <Select value={contaId} onValueChange={setContaId}>
          <SelectTrigger className="h-11 w-full rounded-xl border-line bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          receberArquivo(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          arrastando ? "border-brand bg-brand-wash" : "border-line bg-surface/60",
        )}
      >
        {processando ? (
          <>
            <div className="relative grid size-16 place-items-center">
              <span className="absolute inset-0 rounded-full bg-brand/15 animate-ping [animation-duration:1.8s]" />
              <span className="absolute inset-2 rounded-full bg-brand/20 animate-ping [animation-duration:1.8s] [animation-delay:0.35s]" />
              <span className="absolute inset-4 rounded-full bg-brand/25 animate-ping [animation-duration:1.8s] [animation-delay:0.7s]" />
              <span className="relative grid size-9 place-items-center rounded-full bg-brand text-white shadow-lg">
                <Sparkles className="size-4.5 animate-pulse" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 font-medium text-ink">Analisando o extrato com IA…</p>
            <p className="mt-1 max-w-xs text-micro text-ink-muted">
              Separando lançamentos novos, duplicados e conciliáveis, e sugerindo categoria e
              fornecedor pra cada um novo.
            </p>
          </>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-wash text-brand">
              <UploadCloud className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-medium text-ink">Arraste o arquivo OFX aqui</p>
            <p className="mt-1 max-w-xs text-micro text-ink-muted">
              Ou escolha o arquivo exportado pelo seu banco (.ofx, .qfx).
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 gap-1.5"
              disabled={!contaId}
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="size-4" aria-hidden="true" />
              Escolher arquivo
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".ofx,.qfx"
              className="sr-only"
              onChange={(e) => receberArquivo(e.target.files?.[0])}
            />
          </>
        )}
      </div>

      {erro && (
        <p className="rounded-lg bg-negative/10 px-3 py-2 text-center text-micro text-negative-text">
          {erro}
        </p>
      )}
    </div>
  );
}
