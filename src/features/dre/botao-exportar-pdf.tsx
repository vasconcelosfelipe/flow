"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { OpcoesRelatorio, RelatorioPdf } from "@/features/dre/exportar-pdf";
import type { DreResultado, ResumoDespesasPorCategoria } from "@/services/dre/dto";

type Props = { opcoes: OpcoesRelatorio } & (
  | { dre: DreResultado; resumo?: never }
  | { resumo: ResumoDespesasPorCategoria; dre?: never }
);

/**
 * Entrega o PDF pronto. No celular (principalmente o app instalado no iOS,
 * onde download por âncora é instável) abre a folha de compartilhar do
 * sistema — de lá vira "Salvar em Arquivos", imprimir, mandar por mensagem.
 * No desktop, ou se o aparelho não compartilha arquivo, baixa direto.
 */
async function entregar({ blob, nomeArquivo }: RelatorioPdf) {
  const arquivo = new File([blob], nomeArquivo, { type: "application/pdf" });
  const toque = window.matchMedia("(pointer: coarse)").matches;

  if (toque && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nomeArquivo });
      return;
    } catch (erro) {
      // Fechar a folha sem escolher nada não é falha.
      if (erro instanceof DOMException && erro.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function BotaoExportarPdf(props: Props) {
  const [gerando, setGerando] = useState(false);

  async function exportar() {
    setGerando(true);
    try {
      // Import dinâmico: jspdf só carrega quando alguém pede o relatório.
      const { gerarPdfDre, gerarPdfResumoDespesas } = await import("@/features/dre/exportar-pdf");
      const relatorio = props.dre
        ? await gerarPdfDre(props.dre, props.opcoes)
        : await gerarPdfResumoDespesas(props.resumo!, props.opcoes);
      await entregar(relatorio);
    } catch {
      toast.error("Não consegui gerar o PDF. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={exportar}
      disabled={gerando}
    >
      {gerando ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <FileDown className="size-4" aria-hidden="true" />
      )}
      {gerando ? "Gerando…" : "Exportar PDF"}
    </Button>
  );
}
