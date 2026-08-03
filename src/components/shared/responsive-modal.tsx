"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export type ResponsiveModalProps = {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  titulo: string;
  /** Some visualmente, mas continua anunciada por leitor de tela. */
  descricao: string;
  children: ReactNode;
  /** Botões de confirmação; no celular ficam fixos no rodapé. */
  rodape?: ReactNode;
  className?: string;
};

/**
 * Um contrato, duas apresentações: gaveta por baixo no celular (polegar
 * alcança, arrastar fecha) e diálogo centralizado no desktop.
 *
 * As duas são a MESMA estrutura de três blocos empilhados verticalmente:
 * cabeçalho fixo, meio rolável, rodapé fixo. O bloco do meio é quem tem que
 * encolher (`min-h-0`) para o `overflow-y-auto` funcionar de verdade — sem
 * `min-h-0`, um item de flexbox nunca fica menor que o próprio conteúdo,
 * então o "rolável" simplesmente cresce e empurra cabeçalho/rodapé/página
 * inteira pra fora da tela junto com ele. Essa é a causa de toda a família
 * de bugs que já vimos aqui (botão sumindo, "rolagem infinita", modal maior
 * que a tela) — não tem outra regra além desta pra lembrar ao mexer aqui.
 */
export function ResponsiveModal({
  aberto,
  aoMudarAberto,
  titulo,
  descricao,
  children,
  rodape,
  className,
}: ResponsiveModalProps) {
  const desktop = useDesktop();

  if (desktop) {
    return (
      <Dialog open={aberto} onOpenChange={aoMudarAberto}>
        <DialogContent
          className={cn("flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg", className)}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription className="sr-only">{descricao}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>

          {rodape && (
            <div className="flex shrink-0 justify-end gap-2 border-t border-line pt-3">
              {rodape}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={aberto} onOpenChange={aoMudarAberto}>
      <DrawerContent className={className}>
        <DrawerHeader className="shrink-0 text-left">
          <DrawerTitle>{titulo}</DrawerTitle>
          <DrawerDescription className="sr-only">{descricao}</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4">{children}</div>

        {rodape && (
          <div className="flex shrink-0 gap-2 border-t border-line px-4 pt-4 pb-[calc(3rem+env(safe-area-inset-bottom))]">
            {rodape}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
