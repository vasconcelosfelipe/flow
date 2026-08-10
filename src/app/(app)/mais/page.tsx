import Link from "next/link";
import { ChevronRight, ShieldCheck, Tags, Users, Wallet } from "lucide-react";

import { Container } from "@/components/layout/container";
import { EmpresaSwitcher } from "@/components/layout/empresa-switcher";
import { AvatarConta, PainelConta } from "@/features/perfil/painel-conta";
import { requireSessao } from "@/lib/sessao";

const ITENS_CADASTRO = [
  { href: "/contas", rotulo: "Contas", icone: Wallet },
  { href: "/contatos", rotulo: "Fornecedores/Clientes", icone: Users },
  { href: "/categorias", rotulo: "Categorias", icone: Tags },
  { href: "/centros-custo", rotulo: "Centros de custo", icone: Tags },
];

/**
 * Ponto de entrada dos cadastros que não cabem nos slots fixos da navegação
 * — e, desde que a barra superior fixa saiu do ar, também de tudo que ela
 * guardava (perfil, trocar de espaço, sair): sem barra global, cada função
 * mora na tela onde já faz sentido morar, não presa no topo o tempo todo.
 * O Console só aparece para quem administra a plataforma — é uma camada
 * acima da empresa, não um cadastro dela.
 */
export default async function MaisPage() {
  const sessao = await requireSessao();

  // Centro de custo é um conceito de empresa — não faz sentido pra um
  // espaço de pessoa física, então some do menu (a rota em si continua
  // funcionando, caso já exista dado cadastrado de antes da troca de tipo).
  const itensCadastro = ITENS_CADASTRO.filter(
    (item) => item.href !== "/centros-custo" || sessao.empresaAtiva?.tipo !== "PESSOA_FISICA",
  );

  return (
    <Container className="space-y-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-titulo font-semibold text-ink">Ajustes</h1>
        <AvatarConta usuario={sessao.usuario} />
      </div>

      <PainelConta usuario={sessao.usuario} />

      {sessao.empresaAtiva && (
        <EmpresaSwitcher empresas={sessao.empresas} ativa={sessao.empresaAtiva} />
      )}

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {itensCadastro.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand">
              <item.icone className="size-4.5" aria-hidden="true" />
            </span>
            <span className="flex-1 text-corpo font-medium text-ink">{item.rotulo}</span>
            <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
          </Link>
        ))}
      </div>

      {sessao.usuario.adminPlataforma && (
        <Link
          href="/console/empresas"
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-night text-night-text">
            <ShieldCheck className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-corpo font-medium text-ink">Console da plataforma</span>
            <span className="block text-nano text-ink-muted">Espaços e usuários</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-muted/50" aria-hidden="true" />
        </Link>
      )}
    </Container>
  );
}
