import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { BotaoSair } from "@/app/(auth)/sem-empresa/botao-sair";
import { auth } from "@/lib/auth";

/**
 * Usuário autenticado mas sem nenhuma empresa vinculada (`MembroEmpresa`) e
 * sem `adminPlataforma` — não há para onde mandá-lo dentro do app. Fica
 * aqui até um admin o convidar para uma empresa.
 *
 * Não usa `requireSessao()`: essa função redireciona justamente para esta
 * página quando não há empresa, então chamá-la aqui criaria um redirect
 * para si mesma a cada carregamento.
 */
export default async function SemEmpresaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-night">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-white/10 text-night-text">
        <Building2 className="size-6" aria-hidden="true" />
      </span>

      <h1 className="mt-4 text-titulo font-semibold text-night-text">Sem espaço vinculado</h1>
      <p className="mt-2 text-micro text-night-muted">
        Sua conta ainda não faz parte de nenhum espaço. Peça a um administrador para te
        convidar — assim que isso acontecer, é só entrar de novo.
      </p>

      <p className="mt-4 truncate text-nano text-night-muted">{session.user.email}</p>

      <BotaoSair />
    </div>
  );
}
