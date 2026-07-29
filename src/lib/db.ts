import { PrismaClient } from "@prisma/client";

// Singleton: sem isso o HMR do Next.js abre N pools em dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = new PrismaClient());
