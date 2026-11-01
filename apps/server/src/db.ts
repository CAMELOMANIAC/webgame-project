import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import {
  drizzle,
  type PostgresJsDatabase,
  type PostgresJsQueryResultHKT,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./db/schema";

export * from "./db/schema";
export { schema };

export type DrizzleInstance = PostgresJsDatabase<typeof schema>;
export type TransactionClient = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export type Database = DrizzleInstance & {
  $disconnect: () => Promise<void>;
};
export type DbOrTx = Database | DrizzleInstance | TransactionClient;

export function createDatabase(
  url = process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
): Database {
  const client = postgres(url, {
    prepare: false,
    onnotice: () => {},
  });
  const instance = drizzle(client, { schema });
  return Object.assign(instance, {
    $disconnect: async () => {
      await client.end({ timeout: 5 });
    },
  });
}

const globalForDb = globalThis as unknown as { db?: Database };

export const db: Database = globalForDb.db ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
