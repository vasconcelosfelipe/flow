@AGENTS.md

# Flow — guia do projeto

Gestão financeira empresarial (PWA, pt-BR). Este arquivo existe para não ter
que redescobrir, a cada conversa, o que já foi decidido — mantenha-o
atualizado quando uma convenção nova se firmar ou uma antiga mudar.

## Stack

- Next.js 16 (App Router, Turbopack), Server Actions
- Better Auth (adapter Prisma) + Prisma ORM + PostgreSQL
- Tailwind CSS v4 + shadcn/ui (Radix) + vaul (bottom sheet mobile)
- Docker Compose na VPS (não Vercel) — ver "Deploy" abaixo

## Estrutura

```
src/app/(app)/<rota>/page.tsx   Server Component: busca dados, monta a página
src/features/<domínio>/*.tsx    Client Components: formulários, listas, modais
src/services/<domínio>/
  index.ts                      queries (listarX, mapearX)
  actions.ts                    "use server" — mutações
  dto.ts                        tipos do contrato UI ↔ dados
src/components/ui/              primitivos shadcn (Button, Input, Select…)
src/components/shared/          compostos do produto (ResponsiveModal, AmountText…)
src/lib/                        money.ts, dates.ts, ofx.ts, icones.ts, utils.ts
prisma/schema.prisma            fonte da verdade do domínio
```

Página busca dados no servidor e repassa como props já mapeadas (nunca o
client component chama `db` direto). Mutação sempre via Server Action em
`actions.ts`, terminando em `revalidatePath(...)` das rotas afetadas.

## Domínio — regras que não são óbvias lendo o schema

- **Dinheiro é sempre centavos (`Int`)**, nunca `Decimal`/`Float`. Formatar
  com `lib/money.ts` (`formatarMoeda`, `formatarValor`, `formatarCompacto`,
  `parseMoeda` para ler input do usuário). Exibir com `<AmountText>`, nunca
  formatando na mão — é ele quem decide cor por sinal, fonte tabular e texto
  acessível.
- **Datas de calendário puro** (`data`, `dataVencimento`, `dataCompetencia` —
  todas `@db.Date`) nascem meia-noite UTC. Qualquer exibição delas passa por
  `lib/dates.ts`, que já aplica `comoCalendario()` internamente
  (`formatarData`, `formatarDataCurta`, `rotularDia`, `chaveDia`…). Sem isso,
  qualquer usuário num fuso atrás de UTC (Brasil inteiro) vê o dia anterior.
  Ao adicionar uma função de exibição de data nova, ela precisa passar por
  `comoCalendario()` também.
- **DRE é 100% orientada por dados**, nunca hardcoded. `LinhaDre` é cadastro
  fixo (as linhas gerenciais: Receita Bruta, Deduções, Custos…); `Categoria`
  aponta pra uma `LinhaDre` via `linhaDreId`. A tela de Categorias decide a
  composição; o serviço de DRE só soma. Não crie lista de categorias no
  código do relatório. Espaço `PESSOA_FISICA` não usa essa cascata — ver
  "Espaço: empresarial vs. pessoal" abaixo.
- **Status de movimentação**: `PREVISTO → PENDENTE → PAGO → CONCILIADO`,
  mais `CANCELADO` (soft-delete). Excluir uma movimentação nunca apaga a
  linha — marca `CANCELADO` — porque preserva histórico e a referência de
  `ImportacaoLinha`. Uma movimentação `CONCILIADO` está casada com uma linha
  de extrato importado; bloqueie edição/exclusão até desfazer a conciliação.
- **Fornecedor/cliente é `Contato`** (`tipo: CLIENTE | FORNECEDOR | AMBOS`),
  referenciado por `Movimentacao.contatoId`. "Fornecedor" na UI é sempre
  esse campo — não crie um campo de texto livre separado.
- **Importação de OFX**: `lib/ofx.ts` faz o parse (SGML tolerante, não XML
  estrito — `CHARSET` do header costuma mentir, o conteúdo real é UTF-8).
  Dedup é por `origemFitId` (`@@unique([contaId, origemFitId])`) — reimportar
  o mesmo arquivo não duplica. Uma linha `CONCILIAVEL` fecha uma `PENDENTE`
  existente (mesma conta, tipo e valor) em vez de criar lançamento novo.

## Espaço: empresarial vs. pessoal

Todo espaço (`Empresa` no schema — "empresa" é o nome técnico, a UI diz
"espaço", ver "Idioma/nomenclatura" abaixo) tem um `tipo: TipoEmpresa`
(`EMPRESA` ou `PESSOA_FISICA`, rótulos "Empresarial"/"Pessoal"). Hoje só é
definido no formulário de cadastro do Console (`formulario-empresa.tsx`),
já que criar espaço é admin-only — `empresaAtiva.tipo` chega em toda página
via `requireSessao()`.

**Regra fixa: nunca criar um modal/tela separada para o caso pessoal.**
Um único componente atende os dois tipos, recebendo `tipoEspaco: TipoEmpresa`
como prop e escondendo/trocando só os campos que não fazem sentido pro tipo
pessoal — nunca um `FormularioCategoriaPessoal` ao lado de
`FormularioCategoria`, nunca uma paginação de rota `/dre` vs. `/resumo`.
Motivo: manter dois componentes quase-iguais sincronizados é o tipo de
dívida que gera bugs silenciosos (uma mudança feita num esquece do outro) —
um único componente com um `if`/`{tipoEspaco !== "PESSOA_FISICA" && (...)}`
não tem como divergir.

Exemplos já no código:
- `FormularioCategoria` (`features/categorias/formulario-categoria.tsx`)
  recebe `tipoEspaco` e esconde o bloco "Linha da DRE" inteiro quando
  `PESSOA_FISICA` — o resto do formulário (nome, tipo, cor, ícone,
  categoria pai) é idêntico pros dois tipos.
- `/dre/page.tsx` é uma única rota — o Server Component decide, a partir de
  `empresaAtiva.tipo`, se busca `montarDre` (cascata) ou
  `montarResumoDespesasPorCategoria` (lista por categoria) e qual par de
  componentes de conteúdo renderizar, mas reaproveita o mesmo
  `<FiltrosDre>` (seletor de mês/ano) nos dois casos.
- `BottomNav`/`DesktopRail` recebem `tipoEspaco` e trocam só o `rotulo` do
  destino `/dre` pra "Resumo" quando pessoal — a lista `DESTINOS` e a rota
  continuam as mesmas.

Ao adicionar uma tela/formulário novo que deveria se comportar diferente
pra pessoa física: comece assumindo que é o **mesmo componente** com um
prop `tipoEspaco` novo, não um componente irmão. Só quebre esse padrão se
o formulário for genuinamente outra coisa (não um subconjunto de campos).

Um segundo bug de UX já corrigido nesse entorno: qualquer formulário que
cria uma categoria "no meio do caminho" (o "+ Nova categoria" dentro do
seletor de categoria/fornecedor, usado em Nova movimentação, Nova
pendência, edição de movimentação, compra no cartão e revisão de OFX)
precisa herdar o tipo Receita/Despesa do lançamento que abriu o seletor —
passe `tipoPadrao` pra `SeletorCategoriaContatoModal`/`FormularioCategoria`
a partir do estado local de tipo daquele formulário. Sem isso a categoria
nasce sempre como Despesa (o default do formulário), mesmo dentro de um
fluxo de Receita, e a pessoa só percebe quando o lançamento salvo aparece
com uma categoria do tipo errado.

## Sistema de design

Tokens em `src/app/globals.css`, sempre semânticos — nunca cor solta:
`bg-canvas` (fundo de página) / `bg-surface` (card) / `text-ink` /
`text-ink-muted` / `border-line`. Sinalização financeira via `positive` /
`negative` / `attention`, cada um com par `-text` (para tipografia, WCAG AA —
a cor de identidade sozinha reprova contraste sobre branco) e `-wash` (fundo
claro de chip/ícone). Zona escura (`night`/`night-raised`/`night-text`…) é
reservada à UMA área-herói por tela (topo do Início); não duplicar em duas
seções da mesma página.

Escala tipográfica própria — **nunca usar `text-sm`/`text-lg` do Tailwind
puro**, sempre `text-nano` (11px) → `text-micro` (13px) → `text-corpo`
(15px, corpo de texto padrão) → `text-titulo` (22px) → `text-figure` (30px)
→ `text-hero` (44px). Está registrada em `lib/utils.ts` (`extendTailwindMerge`)
para o `cn()` resolver conflito certo — se adicionar um tamanho novo à
escala, registre lá também ou o `twMerge` vai tratá-lo como cor de texto e
descartar por engano.

Alvo de toque mobile: `Button` `default`/`sm` sobem para a faixa confortável
(`h-10`/`h-9`), `lg` é `h-11` — use `lg` em botões de confirmação de
formulário/modal (Salvar, Confirmar exclusão), nunca o tamanho `default` ali.
`Input`/`SelectTrigger` são `h-11` por padrão. Ação destrutiva final (excluir)
é fundo sólido `bg-negative text-white`, não a variante `destructive` (que é
só um wash claro) — reservar o wash para estados secundários/hover.

`ResponsiveModal` (`components/shared/responsive-modal.tsx`) é o único jeito
de abrir modal/drawer no produto — nunca `Dialog`/`Drawer` do shadcn direto.
Contrato de três blocos empilhados, sempre: header `shrink-0`, meio
`min-h-0 flex-1 overflow-y-auto`, rodapé `shrink-0` **em linha** (não
`flex-col`) para botões lado a lado tanto no Dialog (desktop) quanto no
Drawer (mobile). Botões passados por `rodape` levam `flex-1` pra dividir a
largura. Regra vive documentada no comentário do arquivo — releia antes de
mexer, é a origem de toda uma família de bugs já resolvida (rolagem
infinita, botão sumindo, modal maior que a tela).

## PWA no iOS — armadilhas já resolvidas

O app só é instalável ("Adicionar à Tela de Início") pelo Safari — é
restrição da Apple, nenhum outro navegador no iOS expõe essa opção, mesmo
todos rodando WebKit por baixo. **O usuário testa via app instalado
(standalone), não numa aba do Safari** — isso importa porque várias APIs se
comportam diferente nos dois modos (ver abaixo).

- **Layout raiz usa `min-h-app-safe`, nunca `min-h-dvh` puro.** `100dvh` já
  se mostrou pouco confiável no PWA standalone do iOS quando o conteúdo não
  tem scroll próprio para "assentar" o cálculo dinâmico do viewport — o
  sintoma foi a barra de navegação inferior (`fixed`) descolando de lugar
  depois de abrir/fechar um modal, e só acontecia em telas com conteúdo
  curto. `.min-h-app-safe` (`globals.css`) já resolve isso com
  `min-height: 100vh` + `100lvh`; os três layouts (`(app)`, `(auth)`,
  `(console)`) usam essa classe, nunca `min-h-dvh` cru.
- **`Drawer` (`components/ui/drawer.tsx`) sempre com `repositionInputs={false}`.**
  Ligado (o padrão do `vaul`), a lib escuta `visualViewport.resize` e
  reescreve a altura da gaveta na mão ao abrir o teclado — em formulário
  curto isso encolhe a gaveta pra caber só o campo focado, escondendo o
  resto atrás do teclado. Sem gate de plataforma, roda em qualquer
  navegador — não é fix condicional.
- **`noBodyStyles` do `Drawer` fica no padrão (não desligar).** Essa flag
  liga o travamento de scroll do fundo específico pra Mobile Safari
  (`document.body.style.position = 'fixed'` enquanto o modal está aberto).
  Já tentamos desligar pra evitar uma corrida de restauração entre
  fechar/abrir modais em sequência — piorou: sem ela, o fundo passa a rolar
  livre durante qualquer modal no iOS. Esse mecanismo também **só roda fora
  do modo standalone** (`!isStandalone`) — ao investigar bug de teclado/
  scroll específico de iOS, checar sempre se o app estava rodando instalado
  ou numa aba antes de descartar (ou culpar) esse código.
- **`body[data-scroll-locked]` (react-remove-scroll, por trás do Radix
  Dialog/vaul) já é neutralizado em `globals.css`** — a lib injeta
  `margin-right`/`width` calculados pra compensar a scrollbar clássica que
  não existe no mobile; a regra CSS zera isso sem desligar o lock em si.

## Padrões de UI recorrentes

- Card de lista (`TransactionRow` é a referência): ícone da categoria à
  esquerda, texto principal truncado (nunca quebra linha) numa coluna
  `min-w-0 flex-1`, valor à direita sempre `shrink-0` — sem isso um texto
  longo empurra o valor pra fora do card em vez de truncar.
- Categoria como "pílula": `rounded-full px-2 py-0.5 text-nano`, cor de
  fundo = cor da categoria a 10% (`{cor}1a`), texto = cor cheia.
- Formulário de modal: campos em `space-y-1.5` por grupo (`Label` + campo),
  `space-y-4` entre grupos, botões finais `flex gap-2 pt-2` com `flex-1`
  cada. Ver `nova-movimentacao.tsx` como referência para copiar um form novo.
- **Nenhum campo de lista usa `Select`/`SearchableSelect` do shadcn**
  (dropdown ou popover ancorado no campo — lê como menu de contexto).
  Todo campo do tipo lista é `GatilhoSelecao` (botão) +
  `SeletorListaModal` (`components/shared/`) — folha cheia com busca,
  igual o seletor de categoria/fornecedor. `SeletorListaModal` é genérico
  (`opcoes: {value, label}[]`, `buscavel` desliga a busca em listas curtas
  tipo Status/Tipo); `SeletorCategoriaContatoModal` é a variante
  específica que também sabe cadastrar um item novo na hora. Única
  exceção: campo fora de modal (ex.: `PassoUpload` do wizard de
  importação) — a regra é sobre o padrão de interação dentro de modal,
  não uma proibição do `Select` em toda a UI.

## Verificação de mudanças visuais/PWA

Este projeto não é testado por unit test — mudanças de UI são verificadas
ao vivo, contra a produção (`https://flow.soduscore.com`), pelo Browser
tool: login, exercitar o fluxo, medir DOM quando o bug é de layout (rect,
scrollHeight), e sempre limpar dado de teste criado (via `psql` na VPS)
depois. Rodar `npm run typecheck` antes de deploy é obrigatório (e um
`npm run build` completo sempre que mexer em arquivo `"use server"` — o
typecheck sozinho não pega toda quebra, ver "Deploy"); `npm run lint` pode
acusar erros pré-existentes (`react-hooks/static-components` em componentes
que criam `Icone = iconeDe(...)` no corpo do componente,
`react-hooks/set-state-in-effect` nalguns `useEffect`) — não são regressão
sua a menos que a linha apontada seja código que você escreveu.

Bug de layout/viewport no iOS **não reproduz igual em toda parte**: o
usuário testa o PWA instalado (standalone), não uma aba do Safari — e
várias APIs (`display-mode`, altura de viewport, o próprio `vaul`) se
comportam diferente entre os dois modos. Sem acesso a um iPhone real, dá
pra reproduzir localmente sem login criando uma rota de teste temporária
fora do grupo `(app)` — ela ainda cai no redirect do `middleware.ts` (ver
`PUBLIC_PATHS`), mas plantar um cookie `better-auth.session_token` fake no
navegador (só localhost, nunca produção) já basta pra passar pelo gate,
já que a validação de verdade é em `requireSessao()`, não no middleware.
Apagar a rota depois — nunca faz parte do produto.

## Deploy

VPS OVH (CyberPanel + OpenLiteSpeed como proxy reverso TLS, sem nginx/certbot
próprios) — `51.81.86.18`, app em `/opt/flow`, containers `flow-app-1` /
`flow-db-1` (Postgres). SSH:

```bash
ssh -i "C:\Users\felip\Documents\ovh_cloud\id_ed25519" -o IdentitiesOnly=yes ubuntu@51.81.86.18
```

O deploy **é via git**, não rsync (o README na raiz ainda descreve o método
antigo — desatualizado). Sequência sempre nessa ordem:

```bash
cd /opt/flow
git fetch origin && git merge --ff-only origin/main   # fetch é obrigatório: merge sozinho usa ref local desatualizada
bash deploy/deploy.sh                                  # docker compose build + up -d + aplica migrations pendentes
```

`deploy/deploy.sh` aplica migrations lendo `prisma/migrations/*/migration.sql`
direto via `psql` (não `prisma migrate deploy`) — checa contra
`_prisma_migrations` antes de rodar cada uma, então é seguro rodar de novo.

Fluxo padrão de toda mudança: commit → push pro GitHub → SSH na VPS → fetch +
merge --ff-only → `deploy.sh` → verificar ao vivo → limpar dado de teste.
Fazer isso automaticamente após qualquer mudança, sem esperar o pedido.

## Idioma

Todo identificador, comentário, string de UI e mensagem de commit é em
português. Não traduza para inglês "para seguir convenção" — a convenção
daqui é português.

**Nomenclatura "empresa" vs. "espaço"**: o model Prisma é `Empresa`
(`empresaId`, `empresaAtiva`, `requireSessao()` etc.) e continua assim no
código — não renomear, é usado em centenas de arquivos e a mudança não
traria benefício nenhum além de cosmético. Mas **todo texto visível pro
usuário** (títulos, labels, botões, mensagens) diz "espaço", não "empresa"
— reflete que um espaço pode ser `PESSOA_FISICA`, não só `EMPRESA` (ver
"Espaço: empresarial vs. pessoal"). Ao escrever UI nova: `Empresa`/
`empresaId` no código, "espaço" na tela.
