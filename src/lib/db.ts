import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Singleton: sem isso o HMR do Next.js abre N pools em dev
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function makePrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

// Getter lazy: o Pool só é aberto quando db.algumModelo é acessado,
// não quando o módulo é importado. Importante para build-time.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!global.__prisma) global.__prisma = makePrisma();
    return (global.__prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
