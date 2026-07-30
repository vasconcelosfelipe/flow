"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Suspense, useState } from "react";
import { BarChart3, Tags, Upload } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().trim().email("Digite um e-mail válido."),
  senha: z.string().min(1, "Digite sua senha."),
});

const DESTAQUES = [
  { icone: Upload, texto: "Importe o extrato do banco em OFX" },
  { icone: Tags, texto: "Categorize e organize automaticamente" },
  { icone: BarChart3, texto: "Veja a DRE pronta, sem planilha" },
];

/**
 * Tela de boas-vindas antes do formulário — não só estética. O iOS oferece
 * Face ID/Touch ID assim que um `<input type="password">` aparece na tela
 * (heurística do WebKit, disparada pela presença do campo, não por algo que
 * o app aciona). Montando o formulário só depois de um toque em "Entrar", o
 * autofill biométrico passa a aparecer depois de uma ação deliberada da
 * pessoa, não no instante em que o app abre.
 */
function BoasVindas({ aoEntrar }: { aoEntrar: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-night">
      <h1 className="text-titulo font-semibold text-ink">Organize as finanças da empresa</h1>
      <p className="mt-1 text-micro text-ink-muted">
        Do extrato bancário ao resultado do mês, em poucos passos.
      </p>

      <div className="mt-5 space-y-3 text-left">
        {DESTAQUES.map((d) => (
          <div key={d.texto} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
              <d.icone className="size-4" aria-hidden="true" />
            </span>
            <p className="text-micro font-medium text-ink">{d.texto}</p>
          </div>
        ))}
      </div>

      <Button type="button" className="mt-6 h-11 w-full" onClick={aoEntrar}>
        Entrar
      </Button>
    </div>
  );
}

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/selecionar-empresa";
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function enviar(dados: z.infer<typeof schema>) {
    setEntrando(true);
    setErro(null);
    const { error } = await signIn.email({
      email: dados.email,
      password: dados.senha,
    });
    if (error) {
      setErro("E-mail ou senha incorretos.");
      setEntrando(false);
      return;
    }
    router.push(next);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-night">
      <h1 className="text-titulo font-semibold text-ink">Entrar</h1>
      <p className="mt-1 text-micro text-ink-muted">Acesse sua conta para continuar.</p>

      <form onSubmit={handleSubmit(enviar)} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            {...register("email")}
            placeholder="voce@empresa.com.br"
            className="h-11"
          />
          {errors.email && <p className="text-nano text-negative-text">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            {...register("senha")}
            placeholder="••••••••"
            className="h-11"
          />
          {errors.senha && <p className="text-nano text-negative-text">{errors.senha.message}</p>}
        </div>

        {erro && (
          <p className="rounded-lg bg-negative/10 px-3 py-2 text-nano text-negative-text">
            {erro}
          </p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  if (!mostrarFormulario) {
    return <BoasVindas aoEntrar={() => setMostrarFormulario(true)} />;
  }

  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  );
}
