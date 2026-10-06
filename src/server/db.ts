import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { readEnvironment } from "./env";

const databaseConnectTimeoutMs = 5000;

export type Database = PrismaClient;
export type Transaction = Prisma.TransactionClient;
export type DatabaseOrTransaction = Database | Transaction;

const globalForPrisma = globalThis as typeof globalThis & { sandangPrisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: readEnvironment().DATABASE_URL,
    connectionTimeoutMillis: databaseConnectTimeoutMs,
  });
  return new PrismaClient({ adapter });
}

export function getDb(): PrismaClient {
  globalForPrisma.sandangPrisma ??= createPrismaClient();
  return globalForPrisma.sandangPrisma;
}
