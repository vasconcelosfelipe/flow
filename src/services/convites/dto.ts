import type { PapelMembro } from "@/types/dominio";

/** O que a tela de aceite precisa mostrar antes da pessoa definir a senha —
 * nunca o token em si teria motivo pra virar UI. */
export type ConviteValido = {
  email: string;
  empresaNome: string;
  papel: PapelMembro;
};
