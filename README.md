This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy na VPS (Docker)

Roda numa VPS OVH compartilhada (CyberPanel + OpenLiteSpeed, com outros
sites e serviços já no ar), não na Vercel — o app fica em Docker Compose
(Next.js + Postgres), e quem expõe ao mundo com TLS é o vhost que o
CyberPanel já criou para `flow.soduscore.com`, como proxy reverso para o
container. Não há nginx nem certbot próprios do projeto — o CyberPanel já
resolve domínio e certificado.

**Primeira vez, na VPS** (`/opt/flow`):

```bash
cp .env.example .env   # preencher POSTGRES_PASSWORD (gerar uma senha forte)
docker compose up -d --build
```

Depois, no vhost do CyberPanel (`/usr/local/lsws/conf/vhosts/flow.soduscore.com/vhost.conf`),
adicionar o proxy reverso para a porta 3050 — ver `deploy/cyberpanel-vhost-proxy.conf`
para o trecho exato — e recarregar o OpenLiteSpeed (`sudo systemctl reload lsws`).

**Deploys seguintes** (código chega via `rsync` deste repositório, sem git remoto ainda):

```bash
cd /opt/flow
bash deploy/deploy.sh   # rebuild + restart dos containers
```
