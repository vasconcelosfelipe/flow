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
 * Existe para que nenhuma tela precise decidir isso por conta própria — se
 * cada formulário escolhesse, o app teria dois comportamentos de edição.
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
        <DialogContent className={cn("sm:max-w-lg", className)}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription className="sr-only">{descricao}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-x-hidden overflow-y-auto">{children}</div>
          {rodape && <div className="flex justify-end gap-2 pt-2 pb-1">{rodape}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={aberto} onOpenChange={aoMudarAberto}>
      <DrawerContent className={className}>
        <DrawerHeader className="text-left">
          <DrawerTitle>{titulo}</DrawerTitle>
          <DrawerDescription className="sr-only">{descricao}</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[65vh] overflow-x-hidden overflow-y-auto px-4">{children}</div>
        {rodape && (
          <div className="flex flex-col gap-2 border-t border-line px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {rodape}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
