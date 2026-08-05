import { AlertCircle } from "lucide-react";

import { AceitarConviteCliente } from "@/features/auth/aceitar-convite-cliente";
import { buscarConviteValido } from "@/services/convites";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AceitarConvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  const convite = token ? await buscarConviteValido(token) : null;

  if (!convite || !token) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-night">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-negative-wash text-negative-text">
          <AlertCircle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-titulo font-semibold text-ink">Convite inválido</h1>
        <p className="mt-1.5 text-micro text-ink-muted">
          Este link não existe mais, já foi usado ou expirou. Peça pra quem te convidou enviar um
          novo.
        </p>
      </div>
    );
  }

  return <AceitarConviteCliente token={token} convite={convite} />;
}
