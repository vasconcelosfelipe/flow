@AGENTS.md

# Flow — guia do projeto

Gestão financeira empresarial (PWA, pt-BR). Mantenha atualizado quando uma
convenção mudar — objetivo é não redescobrir decisões a cada conversa.

## Stack

Next.js 16 (App Router, Turbopack, Server Actions) + Better Auth (adapter
Prisma) + Prisma/PostgreSQL + Tailwind v4 + shadcn/ui (Radix) + vaul. Deploy
via Docker Compose em VPS OVH (não Vercel).

## Estrutura

```
src/app/(app)/<rota>/page.tsx   Server Component: busca dados, monta a página
src/features/<domínio>/*.tsx    Client Components: forms, listas, modais
src/services/<domínio>/index.ts    queries | actions.ts "use server" | dto.ts
src/components/ui/              primitivos shadcn
src/components/shared/          compostos (ResponsiveModal, AmountText…)
src/lib/                        money.ts, dates.ts, ofx.ts, icones.ts, utils.ts
prisma/schema.prisma            fonte da verdade do domínio
```

Página busca no servidor, repassa props mapeadas (client nunca chama `db`
direto). Mutação sempre via Server Action terminando em
`revalidatePath(...)` das rotas afetadas.

## Domínio

- **Dinheiro = centavos (`Int`)**, nunca `Decimal`/`Float`. Formatar via
  `lib/money.ts`; exibir com `<AmountText>` (decide cor/fonte/acessibilidade).
- **Datas de calendário puro** (`data`, `dataVencimento`, `dataCompetencia`,
  `@db.Date`) nascem meia-noite UTC. Toda exibição passa por `lib/dates.ts`
  (`comoCalendario()` interno) — sem isso, fuso atrás de UTC (Brasil) mostra
  o dia anterior. Função de data nova precisa passar por `comoCalendario()`.
- **DRE 100% orientada a dado**: `LinhaDre` é cadastro fixo global;
  `Categoria.linhaDreId` decide a composição, o serviço só soma — nunca
  hardcode categoria no relatório. `PESSOA_FISICA` não usa essa cascata
  (ver "Espaço" abaixo).
- **Status de movimentação**: `PREVISTO → PENDENTE → PAGO → CONCILIADO` +
  `CANCELADO` (soft-delete, nunca apaga a linha). `CONCILIADO` = casada com
  extrato importado — bloqueie edição/exclusão até desfazer conciliação.
- **Fornecedor/cliente = `Contato`** (`Movimentacao.contatoId`) — nunca texto
  livre solto.
- **OFX** (`lib/ofx.ts`): parse SGML tolerante (CHARSET do header mente,
  conteúdo real é UTF-8). Dedup por `origemFitId`
  (`@@unique([contaId, origemFitId])`). Linha `CONCILIAVEL` fecha uma
  `PENDENTE` existente (mesma conta/tipo/valor) em vez de duplicar.
  `descricaoOriginal` grava o texto cru do banco (nunca editado) —
  conciliação/aprendizado por trigrama compara contra ele, não contra
  `descricao` (editável), senão renomear um lançamento quebra o match da
  próxima ocorrência parecida.

## Espaço: empresarial vs. pessoal

`Empresa.tipo: TipoEmpresa` (`EMPRESA`/`PESSOA_FISICA`, rótulos
"Empresarial"/"Pessoal") — só editável no Console (`formulario-empresa.tsx`,
admin-only). `empresaAtiva.tipo` chega em toda página via `requireSessao()`.

**Regra fixa: nunca componente/tela separada para o caso pessoal.** Um único
componente recebe `tipoEspaco: TipoEmpresa` e esconde/troca só os campos que
não fazem sentido pro tipo pessoal (`{tipoEspaco !== "PESSOA_FISICA" && ...}`)
— nunca `FormularioXPessoal` ao lado de `FormularioX`, nunca rota irmã tipo
`/dre` vs `/resumo`. Exemplos: `FormularioCategoria` esconde "Linha da DRE";
`/dre/page.tsx` é rota única que decide `montarDre` vs
`montarResumoDespesasPorCategoria`; `BottomNav`/`DesktopRail` só trocam o
`rotulo` do destino. Ao adicionar tela nova com comportamento pessoa-física
diferente: assuma mesmo componente + prop nova, não componente irmão.

Formulário que cria categoria "no meio do caminho" (o "+ Nova categoria" no
seletor, usado em vários fluxos) precisa herdar o tipo Receita/Despesa do
lançamento que abriu o seletor via prop `tipoPadrao` — sem isso a categoria
nasce sempre Despesa mesmo dentro de um fluxo de Receita.

## Sistema de design

Tokens semânticos em `globals.css`, nunca cor solta: `bg-canvas`/`bg-surface`/
`text-ink`/`text-ink-muted`/`border-line`; `positive`/`negative`/`attention`
com par `-text` (tipografia, WCAG AA) e `-wash` (fundo de chip/ícone). Zona
`night`/`night-raised` só numa área-herói por tela (topo do Início).

Escala tipográfica própria — **nunca `text-sm`/`text-lg` do Tailwind puro**:
`text-nano` (11px) → `text-micro` (13px) → `text-corpo` (15px, padrão) →
`text-titulo` (22px) → `text-figure` (30px) → `text-hero` (44px). Registrada
em `lib/utils.ts` (`extendTailwindMerge`) — tamanho novo precisa registrar lá
também, senão `twMerge` trata como cor de texto e descarta.

Toque mobile: `Button` `default`/`sm` = `h-10`/`h-9`, `lg` = `h-11` (usar
`lg` em botão de confirmação de modal/form). `Input`/`SelectTrigger` = `h-11`.
Exclusão final = `bg-negative text-white` sólido, não a variante `destructive`
(só wash claro, reservada a estado secundário/hover).

`ResponsiveModal` é o único jeito de abrir modal/drawer — nunca
`Dialog`/`Drawer` do shadcn direto. Três blocos: header `shrink-0`, meio
`min-h-0 flex-1 overflow-y-auto`, rodapé `shrink-0` **em linha** (botões
`flex-1` lado a lado). Releia o comentário do arquivo antes de mexer — raiz
de uma família de bugs já resolvida (rolagem infinita, botão sumindo, modal
maior que a tela).

## PWA no iOS

Só instalável via Safari (restrição Apple). **Usuário testa app instalado
(standalone), não aba do Safari** — várias APIs se comportam diferente.

- Layout raiz usa `min-h-app-safe`, nunca `min-h-dvh` puro — `100dvh` é
  pouco confiável no standalone sem scroll próprio (causava a barra
  inferior `fixed` descolar após abrir/fechar modal).
- `Drawer` sempre com `repositionInputs={false}` — ligado, o `vaul` encolhe
  a gaveta ao abrir teclado em formulário curto.
- `noBodyStyles` do `Drawer` fica no padrão (não desligar) — trava scroll
  do fundo no Mobile Safari; já tentamos desligar e piorou. Só roda fora do
  standalone (`!isStandalone`) — checar esse detalhe ao investigar bug de
  teclado/scroll do iOS.
- `body[data-scroll-locked]` (react-remove-scroll) já neutralizado em
  `globals.css`.

## Padrões de UI

- Card de lista (`TransactionRow`): ícone à esquerda, texto truncado em
  `min-w-0 flex-1`, valor `shrink-0` à direita.
- Categoria = pílula: `rounded-full px-2 py-0.5 text-nano`, fundo = cor a
  10% (`{cor}1a`), texto = cor cheia.
- Form de modal: `space-y-1.5` por grupo, `space-y-4` entre grupos, botões
  finais `flex gap-2 pt-2` com `flex-1`. Ref: `nova-movimentacao.tsx`.
- **Nenhum campo de lista usa `Select`/popover ancorado** (lê como menu de
  contexto). Todo campo de lista é `GatilhoSelecao` (botão) +
  `SeletorListaModal` — folha cheia com busca (`buscavel={false}` desliga
  em listas curtas). `SeletorCategoriaContatoModal` é a variante que também
  cadastra item novo na hora. Única exceção: campo fora de modal (ex.:
  `PassoUpload` do wizard de importação).

## Verificação

Sem unit test — mudanças de UI verificadas ao vivo contra produção
(`https://flow.soduscore.com`) via Browser tool; limpar dado de teste (via
`psql` na VPS) depois. `npm run typecheck` obrigatório antes de deploy;
`npm run build` completo sempre que mexer em arquivo `"use server"`
(typecheck sozinho não pega toda quebra). `npm run lint` pode acusar erros
pré-existentes — não são regressão sua a menos que a linha seja código seu.

Bug de layout iOS não reproduz igual em toda parte (standalone vs. aba).
Sem iPhone real: rota de teste temporária fora de `(app)` + cookie
`better-auth.session_token` fake no navegador local (nunca produção) passa
pelo `middleware.ts`, já que a validação real é em `requireSessao()`.
Apagar a rota depois.

## Deploy

VPS OVH — `51.81.86.18`, app em `/opt/flow`, containers `flow-app-1`/
`flow-db-1`. SSH:
```bash
ssh -i "C:\Users\felip\Documents\ovh_cloud\id_ed25519" -o IdentitiesOnly=yes ubuntu@51.81.86.18
```

Deploy é via git (não rsync — README na raiz está desatualizado):
```bash
cd /opt/flow
git fetch origin && git merge --ff-only origin/main   # fetch obrigatório
bash deploy/deploy.sh                                  # build + up -d + migrations
```
`deploy.sh` aplica `prisma/migrations/*/migration.sql` via `psql` direto
(não `prisma migrate deploy`), checando `_prisma_migrations` antes — seguro
rodar de novo.

Fluxo padrão, automático após qualquer mudança sem esperar pedido: commit →
push → SSH → fetch + merge --ff-only → `deploy.sh` → verificar ao vivo →
limpar dado de teste.

## Idioma

Tudo em português (identificador, comentário, UI, commit) — não traduza pra
"seguir convenção", a convenção daqui é português.

**"Empresa" (código) vs. "espaço" (UI)**: model Prisma continua `Empresa`/
`empresaId` (não renomear, usado em centenas de arquivos). Todo texto
visível ao usuário diz "espaço", nunca "empresa".
